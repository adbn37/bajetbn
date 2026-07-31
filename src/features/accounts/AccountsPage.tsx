import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { createAccount, listAllAccounts, updateAccount } from '../../repositories/accountRepository';
import { manageAccount } from '../../repositories/lifecycleRepository';
import type { Account, AccountClassification, AccountType } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

const accountLabels: Record<AccountType, string> = { bank: 'Bank', cash: 'Cash', e_wallet: 'E-wallet', credit_card: 'Credit card' };
const useLabels: Record<AccountClassification, string> = { personal: 'Personal', business: 'Business' };

export function AccountsPage() {
  const { user, profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
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

  async function action(account: Account, type: 'close' | 'restore' | 'delete') {
    const message = type === 'close'
      ? `Close ${account.name}?\n\nYou cannot use it for new payments. Previous money activity will stay available.`
      : type === 'delete'
        ? `Delete ${account.name}?\n\nThis only works when the account has never been used. This cannot be undone.`
        : `Restore ${account.name}?\n\nYou can use it for new payments again.`;
    if (!confirm(message)) return;
    setBusyId(account.id); setError('');
    try { await manageAccount(account.id, type); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusyId(''); }
  }

  return <main className="page">
    <PageHeader eyebrow="Money sources" title="Accounts" description="Add your bank, cash, e-wallet, or credit card accounts. Choose one when recording money in or out." action={<button className="button primary" onClick={() => setModal('create')}>+ Add account</button>} />
    {error && <div className="notice error">{error}</div>}
    <section className="account-summary"><div><span>Total money available</span><strong>{formatMoney(total, profile?.currency || 'BND')}</strong></div><div><span>Accounts in use</span><strong>{active.length}</strong></div><div><span>Closed accounts</span><strong>{closed.length}</strong></div></section>
    <div className="info-banner"><strong>Safe account removal</strong><span>Unused accounts can be deleted. Accounts with money history can only be closed, so old records stay correct.</span></div>
    {loading ? <div className="loading-panel">Loading Accounts…</div> : active.length === 0 ? <EmptyState title="Add your first account" description="Start with BIBD, Baiduri, Cash, an e-wallet, or a credit card." action={<button className="button primary" onClick={() => setModal('create')}>Add account</button>} /> : <AccountList accounts={active} busyId={busyId} onEdit={(account) => { setSelected(account); setModal('edit'); }} onClose={(account) => void action(account, 'close')} onDelete={(account) => void action(account, 'delete')} />}

    {closed.length > 0 && <section className="panel archived-items-panel"><div className="panel-heading"><div><span className="eyebrow">Not used for new payments</span><h2>Closed accounts</h2></div><span className="type-badge">{closed.length}</span></div><div className="account-list">{closed.map((account) => <article className="account-card archived" key={account.id}><span className={`account-symbol large ${account.type}`}>{account.name.charAt(0)}</span><div className="account-main"><div><h2>{account.name}</h2><p>{account.institution || accountLabels[account.type]} · Closed</p></div><small>{account.displayId}</small></div><div className="account-balance"><span>Last balance</span><strong>{formatMoney(account.ledgerBalanceMinor, account.currency)}</strong><small>Previous activity is kept</small></div><div className="account-actions"><button className="button secondary" disabled={busyId === account.id} onClick={() => void action(account, 'restore')}>{busyId === account.id ? 'Working…' : 'Restore account'}</button></div></article>)}</div></section>}

    {modal === 'create' && profile && <AccountForm currency={profile.currency} onClose={() => setModal(null)} onSubmit={async (values) => { await createAccount(values); setModal(null); await load(); }} />}
    {modal === 'edit' && selected && <AccountForm currency={selected.currency} initial={selected} onClose={() => setModal(null)} onSubmit={async (values) => { await updateAccount({ accountId: selected.id, name: values.name, institution: values.institution, type: values.type, classification: values.classification }); setModal(null); await load(); }} />}
  </main>;
}

function AccountList({ accounts, busyId, onEdit, onClose, onDelete }: { accounts: Account[]; busyId: string; onEdit: (account: Account) => void; onClose: (account: Account) => void; onDelete: (account: Account) => void }) {
  return <section className="account-list">{accounts.map((account) => <article className="account-card" key={account.id}><span className={`account-symbol large ${account.type}`}>{account.name.charAt(0)}</span><div className="account-main"><div><h2>{account.name}</h2><p>{account.institution || accountLabels[account.type]} · {useLabels[account.classification]}</p></div><small>{account.displayId}</small></div><div className="account-balance"><span>Current balance</span><strong>{formatMoney(account.ledgerBalanceMinor, account.currency)}</strong><small>Opening: {formatMoney(account.openingBalanceMinor, account.currency)}</small></div><div className="account-actions"><button className="text-button" onClick={() => onEdit(account)}>Edit</button><button className="text-button" disabled={busyId === account.id} onClick={() => onClose(account)}>Close account</button><button className="text-button danger" disabled={busyId === account.id} onClick={() => onDelete(account)}>Delete</button></div></article>)}</section>;
}

function AccountForm({ currency, initial, onClose, onSubmit }: { currency: string; initial?: Account; onClose: () => void; onSubmit: (values: { name: string; institution?: string; type: AccountType; classification: AccountClassification; currency: string; openingBalanceMinor: number }) => Promise<void> }) {
  const [name, setName] = useState(initial?.name || ''); const [institution, setInstitution] = useState(initial?.institution || ''); const [type, setType] = useState<AccountType>(initial?.type || 'bank'); const [classification, setClassification] = useState<AccountClassification>(initial?.classification || 'personal'); const [opening, setOpening] = useState(initial ? String(initial.openingBalanceMinor / 100) : '0.00'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await onSubmit({ name, institution, type, classification, currency, openingBalanceMinor: initial ? initial.openingBalanceMinor : toMinorUnits(opening) }); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <Modal title={initial ? 'Edit account' : 'Add account'} onClose={onClose}><form className="form-grid" onSubmit={submit}>{error && <div className="notice error span-2">{error}</div>}<label className="span-2">Account name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. BIBD Main" /></label><label>Type<select value={type} onChange={(event) => setType(event.target.value as AccountType)}><option value="bank">Bank</option><option value="cash">Cash</option><option value="e_wallet">E-wallet</option><option value="credit_card">Credit card</option></select></label><label>Used for<select value={classification} onChange={(event) => setClassification(event.target.value as AccountClassification)}><option value="personal">Personal</option><option value="business">Business</option></select></label><label className="span-2">Institution or provider<input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="BIBD, Baiduri, Cash Wallet…" /></label><label className="span-2">Opening balance ({currency})<input disabled={Boolean(initial)} inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} />{initial && <small>The starting balance cannot be changed here. Use Money activity to correct it safely.</small>}</label><div className="modal-actions span-2"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create account'}</button></div></form></Modal>;
}
