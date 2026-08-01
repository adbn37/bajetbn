import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { institutionCodeForLabel, institutionDisplay, institutionOptionsForType } from '../../config/bruneiMoneyOptions';
import { useAuth } from '../../contexts/AuthContext';
import { createAccount, listAllAccounts, updateAccount } from '../../repositories/accountRepository';
import { manageAccount } from '../../repositories/lifecycleRepository';
import type { Account, AccountClassification, AccountType, InstitutionCode } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

const accountLabels: Record<AccountType, string> = { bank: 'Bank', cash: 'Cash', e_wallet: 'E-wallet', credit_card: 'Credit card' };
const useLabels: Record<AccountClassification, string> = { personal: 'Personal', business: 'Business' };
type AccountLifecycleAction = 'close' | 'delete';

export function AccountsPage() {
  const { user, profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [lifecycleDialog, setLifecycleDialog] = useState<LifecycleConfirmState<Account, AccountLifecycleAction> | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try { setAccounts(await listAllAccounts(user.uid)); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const active = useMemo(() => accounts.filter((item) => !item.archivedAt && !item.closedAt), [accounts]);
  const closed = useMemo(() => accounts.filter((item) => item.archivedAt || item.closedAt), [accounts]);
  const total = active.filter((item) => item.type !== 'credit_card').reduce((sum, item) => sum + item.ledgerBalanceMinor, 0);

  function askLifecycle(account: Account, action: AccountLifecycleAction) {
    setError('');
    setLifecycleDialog(action === 'close'
      ? {
          record: account,
          action,
          title: `Close ${account.name}?`,
          description: 'This account will move to Closed Accounts and will no longer appear in new payment forms.',
          note: 'Its last balance and all previous money activity will stay available.',
          confirmLabel: 'Close account',
        }
      : {
          record: account,
          action,
          title: `Delete ${account.name} permanently?`,
          description: 'Permanent deletion only works when this account has never been used for saved money activity.',
          note: 'This cannot be undone.',
          confirmLabel: 'Delete permanently',
          tone: 'danger',
        });
  }

  async function runLifecycle() {
    if (!lifecycleDialog) return;
    const { record: account, action } = lifecycleDialog;
    setBusyId(account.id); setError('');
    try {
      await manageAccount(account.id, action);
      setLifecycleDialog(null);
      await load();
    } catch (nextError) {
      const message = getErrorMessage(nextError);
      if (action === 'delete' && /close/i.test(message)) {
        setLifecycleDialog({
          record: account,
          action: 'close',
          title: `${account.name} cannot be deleted`,
          description: message,
          note: 'Close it instead. It will be hidden from new payments while its financial history remains correct.',
          confirmLabel: 'Close account instead',
        });
      } else setError(message);
    } finally { setBusyId(''); }
  }

  return <main className="page accounts-page">
    <PageHeader eyebrow="Money sources" title="Accounts" description="Add your bank, cash, e-wallet, or credit card accounts. Choose one when recording money in or out." action={<div className="page-header-action-row"><Link className="button secondary archive-button" to="/accounts/closed">Closed Accounts <span>{closed.length}</span></Link><button className="button primary" onClick={() => setModal('create')}>+ Add account</button></div>} />
    {error && !lifecycleDialog && <div className="notice error">{error}</div>}
    <section className="account-summary"><div><span>Total money available</span><strong>{formatMoney(total, profile?.currency || 'BND')}</strong></div><div><span>Accounts in use</span><strong>{active.length}</strong></div><Link to="/accounts/closed" className="account-summary-link"><span>Closed accounts</span><strong>{closed.length}</strong><small>Open archive →</small></Link></section>
    <div className="info-banner"><strong>Safe account removal</strong><span>Unused accounts can be deleted. Accounts with money history are closed instead, so old records stay correct.</span></div>
    {loading ? <div className="loading-panel">Loading Accounts…</div> : active.length === 0 ? <EmptyState title="Add your first account" description="Start with BIBD, Baiduri, Cash, an e-wallet, or a credit card." action={<button className="button primary" onClick={() => setModal('create')}>Add account</button>} /> : <AccountList accounts={active} busyId={busyId} onEdit={(account) => { setSelected(account); setModal('edit'); }} onClose={(account) => askLifecycle(account, 'close')} onDelete={(account) => askLifecycle(account, 'delete')} />}

    {lifecycleDialog && <LifecycleConfirmModal state={lifecycleDialog} busy={busyId === lifecycleDialog.record.id} error={error} onClose={() => { setLifecycleDialog(null); setError(''); }} onConfirm={() => void runLifecycle()} />}
    {modal === 'create' && profile && <AccountForm currency={profile.currency} onClose={() => setModal(null)} onSubmit={async (values) => { await createAccount(values); setModal(null); await load(); }} />}
    {modal === 'edit' && selected && <AccountForm currency={selected.currency} initial={selected} onClose={() => setModal(null)} onSubmit={async (values) => { await updateAccount({ accountId: selected.id, name: values.name, institution: values.institution, institutionCode: values.institutionCode, type: values.type, classification: values.classification }); setModal(null); await load(); }} />}
  </main>;
}

function AccountList({ accounts, busyId, onEdit, onClose, onDelete }: { accounts: Account[]; busyId: string; onEdit: (account: Account) => void; onClose: (account: Account) => void; onDelete: (account: Account) => void }) {
  return <section className="account-list">{accounts.map((account) => <article className="account-card" key={account.id}>
    <span className={`account-symbol large ${account.type}`}>{account.name.charAt(0)}</span>
    <div className="account-main"><div><h2>{account.name}</h2><p>{institutionDisplay(account)} · {accountLabels[account.type]} · {useLabels[account.classification]}</p></div><small>{account.displayId}</small></div>
    <div className="account-balance"><span>Current balance</span><strong>{formatMoney(account.ledgerBalanceMinor, account.currency)}</strong><small className="account-secondary-detail">Opening: {formatMoney(account.openingBalanceMinor, account.currency)}</small></div>
    <div className="account-actions"><Link className="text-button account-view-activity" to={`/transactions?accountId=${encodeURIComponent(account.id)}`}>View activity</Link><button className="text-button" onClick={() => onEdit(account)}>Edit</button><button className="text-button" disabled={busyId === account.id} onClick={() => onClose(account)}>Close</button><button className="text-button danger" disabled={busyId === account.id} onClick={() => onDelete(account)}>Delete</button></div>
  </article>)}</section>;
}

function AccountForm({ currency, initial, onClose, onSubmit }: { currency: string; initial?: Account; onClose: () => void; onSubmit: (values: { name: string; institution?: string; institutionCode?: InstitutionCode | null; type: AccountType; classification: AccountClassification; currency: string; openingBalanceMinor: number }) => Promise<void> }) {
  const [name, setName] = useState(initial?.name || '');
  const [institution, setInstitution] = useState(initial?.institution || institutionDisplay(initial || { type: 'bank' }));
  const [type, setType] = useState<AccountType>(initial?.type || 'bank');
  const [classification, setClassification] = useState<AccountClassification>(initial?.classification || 'personal');
  const [opening, setOpening] = useState(initial ? String(initial.openingBalanceMinor / 100) : '0.00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const options = institutionOptionsForType(type);

  const changeType = (nextType: AccountType) => {
    setType(nextType);
    if (nextType === 'cash') setInstitution('Cash');
    else if (nextType === 'e_wallet' && institution === 'Cash') setInstitution('');
    else if (type === 'cash' && institution === 'Cash') setInstitution('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const cleanInstitution = institution.trim();
      await onSubmit({
        name: name.trim(),
        institution: cleanInstitution,
        institutionCode: institutionCodeForLabel(cleanInstitution),
        type,
        classification,
        currency,
        openingBalanceMinor: initial ? initial.openingBalanceMinor : toMinorUnits(opening),
      });
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <Modal title={initial ? 'Edit account' : 'Add account'} onClose={onClose}><form className="form-grid" onSubmit={submit}>
    {error && <div className="notice error span-2">{error}</div>}
    <label className="span-2">Account name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. BIBD Main" /></label>
    <label>Type<select value={type} onChange={(event) => changeType(event.target.value as AccountType)}><option value="bank">Bank</option><option value="cash">Cash</option><option value="e_wallet">E-wallet</option><option value="credit_card">Credit card</option></select></label>
    <label>Used for<select value={classification} onChange={(event) => setClassification(event.target.value as AccountClassification)}><option value="personal">Personal</option><option value="business">Business</option></select></label>
    <label className="span-2">Institution or provider
      <input list="brunei-institution-options" value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder={type === 'cash' ? 'Cash' : type === 'e_wallet' ? 'Choose or type an e-wallet' : 'Choose or type a bank'} />
      <datalist id="brunei-institution-options">{options.map((item) => <option key={item.code} value={item.shortLabel}>{item.label}</option>)}</datalist>
      <small>Choose a common Brunei option or type another institution. Existing custom names still work.</small>
    </label>
    <div className="institution-preset-grid span-2" aria-label="Common Brunei institutions">{options.filter((item) => item.code !== 'other').map((item) => <button type="button" className="institution-preset" key={item.code} onClick={() => setInstitution(item.shortLabel)}>{item.shortLabel}</button>)}</div>
    <label className="span-2">Opening balance ({currency})<input disabled={Boolean(initial)} inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} />{initial && <small>The starting balance cannot be changed here. Use Money activity to correct it safely.</small>}</label>
    <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create account'}</button></div>
  </form></Modal>;
}
