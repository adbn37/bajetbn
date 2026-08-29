import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { institutionCodeForLabel, institutionDisplay, institutionOptionsForType } from '../../config/bruneiMoneyOptions';
import { useAuth } from '../../contexts/AuthContext';
import {
  createAccount,
  listAllAccounts,
  listAllPersonalAccounts,
  listAccountsForOwnerSpace,
  updateAccount,
} from '../../repositories/accountRepository';
import {
  ACCOUNT_COLOR_OPTIONS,
  accountColorClass,
  getAccountColor,
  setAccountColor,
  type AccountColor,
} from '../../services/accountVisualPreferences';
import { manageAccount } from '../../repositories/lifecycleRepository';
import {
  getSpace,
  listSpaces,
} from '../../repositories/spaceRepository';
import type { Account, AccountClassification, AccountType, InstitutionCode, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

const accountLabels: Record<AccountType, string> = { bank: 'Bank', cash: 'Cash', e_wallet: 'E-wallet', credit_card: 'Credit card' };
type AccountLifecycleAction = 'close' | 'delete';

export function AccountsPage({
  spaceIdOverride,
  embedded = false,
}: {
  spaceIdOverride?: string;
  embedded?: boolean;
} = {}) {
  const { user, profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [lifecycleDialog, setLifecycleDialog] = useState<LifecycleConfirmState<Account, AccountLifecycleAction> | null>(null);

  const load = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      if (spaceIdOverride) {
        const targetSpace =
          await getSpace(spaceIdOverride);

        if (!targetSpace) {
          throw new Error(
            'This Space is no longer available.',
          );
        }

        const nextAccounts =
          targetSpace.type === 'personal'
            ? await listAllPersonalAccounts(
                user.uid,
              )
            : await listAccountsForOwnerSpace(
                user.uid,
                spaceIdOverride,
              );

        setAccounts(nextAccounts);
        setSpaces([targetSpace]);
        return;
      }

      const [
        nextAccounts,
        nextSpaces,
      ] = await Promise.all([
        listAllAccounts(user.uid),
        listSpaces(user.uid),
      ]);

      setAccounts(nextAccounts);
      setSpaces(nextSpaces);
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(
    () => {
      void load();
    },
    [spaceIdOverride, user],
  );
  useEffect(() => { void load(); }, [user]);

  const active = useMemo(() => accounts.filter((item) => !item.archivedAt && !item.closedAt), [accounts]);
  const closed = useMemo(() => accounts.filter((item) => item.archivedAt || item.closedAt), [accounts]);
  const total = active.filter((item) => item.type !== 'credit_card').reduce((sum, item) => sum + item.ledgerBalanceMinor, 0);
  const ownedSmeSpaces = useMemo(
    () => spaces.filter((item) => item.type === 'sme' && item.ownerId === user?.uid),
    [spaces, user?.uid],
  );
  const unassignedBusinessCount = useMemo(
    () => active.filter((item) => item.classification === 'business' && !item.spaceId).length,
    [active],
  );

  const accountHeaderAction =
    embedded
      ? (
          <button
            className="button primary"
            onClick={() =>
              setModal('create')
            }
          >
            + Add account
          </button>
        )
      : (
          <div className="page-header-action-row">
            <Link
              className="button secondary archive-button"
              to="/accounts/closed"
            >
              Closed Accounts
              {' '}
              <span>{closed.length}</span>
            </Link>

            <button
              className="button primary"
              onClick={() =>
                setModal('create')
              }
            >
              + Add account
            </button>
          </div>
        );

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

  return <main className={embedded ? 'page accounts-page embedded-module-page' : 'page accounts-page'}>
    <PageHeader
      eyebrow={embedded ? 'Personal Space' : 'Money sources'}
      title="Accounts"
      description={
        embedded
          ? 'Manage the personal accounts available to this Personal Space.'
          : 'Add personal or business bank, cash, e-wallet, and credit card accounts. Business ownership and POS availability are controlled here.'
      }
      action={accountHeaderAction}
    />
    {error && !lifecycleDialog && <div className="notice error">{error}</div>}
    <section className="account-summary">
      <div>
        <span>Total money available</span>
        <strong>
          {formatMoney(
            total,
            profile?.currency || 'BND',
          )}
        </strong>
      </div>

      <div>
        <span>Accounts in use</span>
        <strong>{active.length}</strong>
      </div>

      {!embedded && (
        <Link
          to="/accounts/closed"
          className="account-summary-link"
        >
          <span>Closed accounts</span>
          <strong>{closed.length}</strong>
          <small>Open archive →</small>
        </Link>
      )}
    </section>
    {!embedded && (
      <div className="info-banner">
        <strong>
          Business account ownership
        </strong>
        <span>
          Assign each business account to one SME here.
          Only accounts belonging to that SME and enabled
          for POS can be used at its checkout.
          Managers and cashiers cannot change this.
        </span>
      </div>
    )}
    {!embedded
      && unassignedBusinessCount > 0
      && (
        <div className="notice">
          {unassignedBusinessCount}
          {' '}
          existing business account
          {unassignedBusinessCount === 1
            ? ' is'
            : 's are'}
          {' '}
          not assigned to an SME yet.
        </div>
      )}
    {loading ? <div className="loading-panel">Loading Accounts…</div> : active.length === 0 ? <EmptyState title="Add your first account" description="Start with BIBD, Baiduri, Cash, an e-wallet, or a credit card." action={<button className="button primary" onClick={() => setModal('create')}>Add account</button>} /> : <AccountGroups accounts={active} spaces={ownedSmeSpaces} spaceIdOverride={spaceIdOverride} busyId={busyId} onEdit={(account) => { setSelected(account); setModal('edit'); }} onClose={(account) => askLifecycle(account, 'close')} onDelete={(account) => askLifecycle(account, 'delete')} />}

    {lifecycleDialog && <LifecycleConfirmModal state={lifecycleDialog} busy={busyId === lifecycleDialog.record.id} error={error} onClose={() => { setLifecycleDialog(null); setError(''); }} onConfirm={() => void runLifecycle()} />}
    {modal === 'create' && profile && <AccountForm currency={profile.currency} spaces={ownedSmeSpaces} lockedPersonal={Boolean(spaceIdOverride)} onClose={() => setModal(null)} onSubmit={async (values) => { await createAccount(values); setModal(null); await load(); }} />}
    {modal === 'edit' && selected && <AccountForm currency={selected.currency} spaces={ownedSmeSpaces} initial={selected} lockedPersonal={Boolean(spaceIdOverride)} onClose={() => setModal(null)} onSubmit={async (values) => { await updateAccount({ accountId: selected.id, name: values.name, institution: values.institution, institutionCode: values.institutionCode, type: values.type, classification: values.classification, spaceId: values.spaceId, posEnabled: values.posEnabled }); if (user) setAccountColor(user.uid, selected.id, values.color); setModal(null); await load(); }} />}
  </main>;
}

function AccountGroups({ accounts, spaces, spaceIdOverride, busyId, onEdit, onClose, onDelete }: { accounts: Account[]; spaces: Space[]; spaceIdOverride?: string; busyId: string; onEdit: (account: Account) => void; onClose: (account: Account) => void; onDelete: (account: Account) => void }) {
  const personal = accounts.filter((account) => account.classification === 'personal');
  const unassigned = accounts.filter((account) => account.classification === 'business' && !account.spaceId);
  const groups = spaces
    .map((space) => ({ space, accounts: accounts.filter((account) => account.classification === 'business' && account.spaceId === space.id) }))
    .filter((group) => group.accounts.length > 0);

  const actions = { busyId, onEdit, onClose, onDelete };

  return <div className="form-stack">
    {personal.length > 0 && <section>
      <div className="panel-heading"><div><span className="eyebrow">Personal</span><h2>Personal accounts</h2></div><span>{personal.length}</span></div>
      <AccountList accounts={personal} spaces={spaces} spaceIdOverride={spaceIdOverride} {...actions} />
    </section>}
    {groups.map(({ space, accounts: businessAccounts }) => <section key={space.id}>
      <div className="panel-heading"><div><span className="eyebrow">Business</span><h2>{space.name}</h2></div><span>{businessAccounts.length}</span></div>
      <AccountList accounts={businessAccounts} spaces={spaces} spaceIdOverride={spaceIdOverride} {...actions} />
    </section>)}
    {unassigned.length > 0 && <section>
      <div className="panel-heading"><div><span className="eyebrow">Needs setup</span><h2>Unassigned business accounts</h2></div><span>{unassigned.length}</span></div>
      <AccountList accounts={unassigned} spaces={spaces} spaceIdOverride={spaceIdOverride} {...actions} />
    </section>}
  </div>;
}

function AccountList({ accounts, spaces, spaceIdOverride, busyId, onEdit, onClose, onDelete }: { accounts: Account[]; spaces: Space[]; spaceIdOverride?: string; busyId: string; onEdit: (account: Account) => void; onClose: (account: Account) => void; onDelete: (account: Account) => void }) {
  const { user } = useAuth();
  const spaceName = (account: Account) => account.spaceId ? spaces.find((space) => space.id === account.spaceId)?.name || 'Business' : 'Unassigned business';

  return <section className="account-list">{accounts.map((account, index) => <article className={`account-card ${accountColorClass(getAccountColor(user?.uid || '', account.id, index))}`} key={account.id}>
    <span className={`account-symbol large ${account.type}`}>{account.name.charAt(0)}</span>
    <div className="account-main"><div><h2>{account.name}</h2><p>{institutionDisplay(account)} · {accountLabels[account.type]} · {account.classification === 'personal' ? 'Personal' : spaceName(account)}{account.classification === 'business' && account.posEnabled ? ' · POS enabled' : ''}</p></div><small>{account.displayId}</small></div>
    <div className="account-balance"><span>Current balance</span><strong>{formatMoney(account.ledgerBalanceMinor, account.currency)}</strong><small className="account-secondary-detail">Opening: {formatMoney(account.openingBalanceMinor, account.currency)}</small></div>
    <div className="account-actions"><Link
      className="text-button account-view-activity"
      to={
        spaceIdOverride
          ? `/spaces/${spaceIdOverride}?section=money`
          : `/transactions?accountId=${encodeURIComponent(account.id)}`
      }
    >
      View activity
    </Link><button className="text-button" onClick={() => onEdit(account)}>Edit</button><button className="text-button" disabled={busyId === account.id} onClick={() => onClose(account)}>Close</button><button className="text-button danger" disabled={busyId === account.id} onClick={() => onDelete(account)}>Delete</button></div>
  </article>)}</section>;
}

type AccountFormValues = {
  name: string;
  institution?: string;
  institutionCode?: InstitutionCode | null;
  type: AccountType;
  classification: AccountClassification;
  spaceId?: string | null;
  posEnabled?: boolean;
  currency: string;
  openingBalanceMinor: number;
  color: AccountColor;
};

function AccountForm({ currency, spaces, initial, lockedPersonal = false, onClose, onSubmit }: { currency: string; spaces: Space[]; initial?: Account; lockedPersonal?: boolean; onClose: () => void; onSubmit: (values: AccountFormValues) => Promise<void> }) {
  const { user } = useAuth();
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState<AccountColor>(() =>
    initial
      ? getAccountColor(user?.uid || '', initial.id, 0)
      : 'purple',
  );
  const [institution, setInstitution] = useState(initial?.institution || institutionDisplay(initial || { type: 'bank' }));
  const [type, setType] = useState<AccountType>(initial?.type || 'bank');
  const [classification, setClassification] = useState<AccountClassification>(
    lockedPersonal
      ? 'personal'
      : initial?.classification || 'personal',
  );
  const [spaceId, setSpaceId] = useState(initial?.spaceId || '');
  const [posEnabled, setPosEnabled] = useState(initial?.posEnabled === true);
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

  const changeClassification = (nextClassification: AccountClassification) => {
    if (lockedPersonal) return;

    setClassification(nextClassification);
    if (nextClassification === 'personal') {
      setSpaceId('');
      setPosEnabled(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (classification === 'business' && !spaceId) {
        throw new Error('Choose which SME business owns this account.');
      }
      const cleanInstitution = institution.trim();
      await onSubmit({
        name: name.trim(),
        institution: cleanInstitution,
        institutionCode: institutionCodeForLabel(cleanInstitution),
        type,
        classification,
        spaceId: classification === 'business' ? spaceId : null,
        posEnabled: classification === 'business' ? posEnabled : false,
        currency,
        openingBalanceMinor: initial ? initial.openingBalanceMinor : toMinorUnits(opening),
        color,
      });
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <Modal title={initial ? 'Edit account' : 'Add account'} onClose={onClose}><form className="form-grid" onSubmit={submit}>
    {error && <div className="notice error span-2">{error}</div>}
    <label className="span-2">Account name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. BIBD Main" /></label>
    <label>Type<select value={type} onChange={(event) => changeType(event.target.value as AccountType)}><option value="bank">Bank</option><option value="cash">Cash</option><option value="e_wallet">E-wallet</option><option value="credit_card">Credit card</option></select></label>
    <label>Used for<select value={classification} disabled={lockedPersonal} onChange={(event) => changeClassification(event.target.value as AccountClassification)}><option value="personal">Personal</option><option value="business">Business</option></select></label>
    {classification === 'business' && <label className="span-2">Business / SME Space
      <select value={spaceId} onChange={(event) => setSpaceId(event.target.value)} required>
        <option value="">Choose business</option>
        {spaces.map((space) => <option key={space.id} value={space.id} disabled={Boolean(space.archivedAt)}>{space.name}{space.archivedAt ? ' (Archived)' : ''}</option>)}
      </select>
      <small>This is the account's owner business. Other SME Spaces cannot use it.</small>
    </label>}
    {classification === 'business' && <label className="checkbox-field span-2">
      <input type="checkbox" checked={posEnabled} onChange={(event) => setPosEnabled(event.target.checked)} disabled={!spaceId} />
      <span><strong>Use for this business's POS payments</strong><small>Only the SME owner can change this here. Managers and cashiers can use approved accounts during checkout but cannot attach another account.</small></span>
    </label>}
    {classification === 'business' && !spaces.some((space) => !space.archivedAt) && <div className="notice span-2">Create or restore an SME Space before adding a business account.</div>}
    <label className="span-2">Institution or provider
      <input list="brunei-institution-options" value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder={type === 'cash' ? 'Cash' : type === 'e_wallet' ? 'Choose or type an e-wallet' : 'Choose or type a bank'} />
      <datalist id="brunei-institution-options">{options.map((item) => <option key={item.code} value={item.shortLabel}>{item.label}</option>)}</datalist>
      <small>Choose a common Brunei option or type another institution. Existing custom names still work.</small>
    </label>
    <div className="institution-preset-grid span-2" aria-label="Common Brunei institutions">{options.filter((item) => item.code !== 'other').map((item) => <button type="button" className="institution-preset" key={item.code} onClick={() => setInstitution(item.shortLabel)}>{item.shortLabel}</button>)}</div>
    <fieldset className="account-color-field span-2">
      <legend>Account colour</legend>

      <div className="account-color-picker">
        {ACCOUNT_COLOR_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`account-color-choice account-color-${option.value} ${color === option.value ? 'active' : ''}`}
            aria-label={`Use ${option.label} for this account`}
            aria-pressed={color === option.value}
            onClick={() => setColor(option.value)}
          >
            <span aria-hidden="true" />
            <small>{option.label}</small>
          </button>
        ))}
      </div>

      {!initial && (
        <small>
          New accounts start with this colour automatically.
          You can change it later from Edit account.
        </small>
      )}
    </fieldset>

    <label className="span-2">Opening balance ({currency})<input disabled={Boolean(initial)} inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} />{initial && <small>The starting balance cannot be changed here. Use Money activity to correct it safely.</small>}</label>
    <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create account'}</button></div>
  </form></Modal>;
}
