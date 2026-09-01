import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { institutionCodeForLabel, institutionDisplay, institutionOptionsForType } from '../../config/bruneiMoneyOptions';
import { useAuth } from '../../contexts/AuthContext';
import {
  businessSpaceIdsForAccount,
  createAccount,
  listAccountAccess,
  listAllAccounts,
  listAllPersonalAccounts,
  listAccountsForOwnerSpace,
  listAccountsForSpace,
  posSpaceIdsForAccount,
  setBusinessAccountMemberAccess,
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
import { listSpaceMembers } from '../../repositories/collaborationRepository';
import {
  getSpace,
  listSpaces,
} from '../../repositories/spaceRepository';
import type {
  Account,
  AccountAccess,
  AccountClassification,
  AccountType,
  InstitutionCode,
  Space,
  SpaceMember,
} from '../../types/models';
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
  const [sharing, setSharing] = useState<Account | null>(null);
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
            : targetSpace.type === 'sme'
              ? await listAccountsForSpace(
                  spaceIdOverride,
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

  const active = useMemo(() => accounts.filter((item) => !item.archivedAt && !item.closedAt), [accounts]);
  const closed = useMemo(() => accounts.filter((item) => item.archivedAt || item.closedAt), [accounts]);
  const total = active.filter((item) => item.type !== 'credit_card').reduce((sum, item) => sum + item.ledgerBalanceMinor, 0);
  const ownedSmeSpaces = useMemo(
    () => spaces.filter((item) => item.type === 'sme' && item.ownerId === user?.uid),
    [spaces, user?.uid],
  );
  const embeddedSpace =
    spaceIdOverride
      ? spaces[0] || null
      : null;

  const visibleSmeSpaces =
    embedded
    && embeddedSpace?.type === 'sme'
      ? [embeddedSpace]
      : ownedSmeSpaces;

  const canManageEmbeddedAccounts =
    !embedded
    || !embeddedSpace
    || embeddedSpace.ownerId === user?.uid;

  const unassignedBusinessCount = useMemo(
    () => active.filter(
      (item) =>
        item.classification === 'business'
        && businessSpaceIdsForAccount(item).length === 0,
    ).length,
    [active],
  );

  const accountHeaderAction =
    embedded && !canManageEmbeddedAccounts
      ? null
      : embedded
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
      eyebrow={
        embedded
          ? embeddedSpace?.type === 'sme'
            ? 'Business Space'
            : 'Personal Space'
          : 'Money sources'
      }
      title="Accounts"
      description={
        embedded
          ? embeddedSpace?.type === 'sme'
            ? canManageEmbeddedAccounts
              ? 'Manage the Business accounts linked to this Business Space.'
              : 'Business accounts the owner has shared with you in this Space.'
            : 'Manage the personal accounts available to this Personal Space.'
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
          Business accounts can serve multiple Businesses
        </strong>
        <span>
          Personal accounts stay Personal-only. A Business account can be linked
          to several Business Spaces without duplicating its real balance.
          Choose POS availability per Business, then share that account with
          selected members when they need financial access.
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
          not assigned to a Business Space yet.
        </div>
      )}
    {loading
      ? <div className="loading-panel">Loading Accounts…</div>
      : active.length === 0
        ? <EmptyState
            title={embeddedSpace?.type === 'sme' && !canManageEmbeddedAccounts ? 'No Business account shared with you' : 'Add your first account'}
            description={embeddedSpace?.type === 'sme' && !canManageEmbeddedAccounts ? 'The Business owner can share a linked account with you from Accounts.' : 'Start with BIBD, Baiduri, Cash, an e-wallet, or a credit card.'}
            action={canManageEmbeddedAccounts ? <button className="button primary" onClick={() => setModal('create')}>Add account</button> : undefined}
          />
        : <AccountGroups
            accounts={active}
            spaces={visibleSmeSpaces}
            spaceIdOverride={spaceIdOverride}
            busyId={busyId}
            onEdit={(account) => { setSelected(account); setModal('edit'); }}
            onShare={(account) => setSharing(account)}
            onClose={(account) => askLifecycle(account, 'close')}
            onDelete={(account) => askLifecycle(account, 'delete')}
          />}

    {sharing && sharing.ownerId === user?.uid && (
      <BusinessAccountShareModal
        account={sharing}
        spaces={ownedSmeSpaces}
        onClose={() => setSharing(null)}
      />
    )}

    {lifecycleDialog && <LifecycleConfirmModal state={lifecycleDialog} busy={busyId === lifecycleDialog.record.id} error={error} onClose={() => { setLifecycleDialog(null); setError(''); }} onConfirm={() => void runLifecycle()} />}

    {modal === 'create' && profile && canManageEmbeddedAccounts && (
      <AccountForm
        currency={profile.currency}
        spaces={visibleSmeSpaces}
        lockedPersonal={embeddedSpace?.type === 'personal'}
        onClose={() => setModal(null)}
        onSubmit={async (values) => {
          await createAccount(values);
          setModal(null);
          await load();
        }}
      />
    )}

    {modal === 'edit' && selected && selected.ownerId === user?.uid && (
      <AccountForm
        currency={selected.currency}
        spaces={visibleSmeSpaces}
        initial={selected}
        lockedPersonal={embeddedSpace?.type === 'personal'}
        onClose={() => setModal(null)}
        onSubmit={async (values) => {
          await updateAccount({
            accountId: selected.id,
            name: values.name,
            institution: values.institution,
            institutionCode: values.institutionCode,
            type: values.type,
            classification: values.classification,
            businessSpaceIds: values.businessSpaceIds,
            posSpaceIds: values.posSpaceIds,
          });
          if (user) {
            setAccountColor(user.uid, selected.id, values.color);
          }
          setModal(null);
          await load();
        }}
      />
    )}
  </main>;
}

function AccountGroups({
  accounts,
  spaces,
  spaceIdOverride,
  busyId,
  onEdit,
  onShare,
  onClose,
  onDelete,
}: {
  accounts: Account[];
  spaces: Space[];
  spaceIdOverride?: string;
  busyId: string;
  onEdit: (account: Account) => void;
  onShare: (account: Account) => void;
  onClose: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  const personal = accounts.filter((account) => account.classification === 'personal');
  const unassigned = accounts.filter(
    (account) =>
      account.classification === 'business'
      && businessSpaceIdsForAccount(account).length === 0,
  );
  const groups = spaces
    .map((space) => ({
      space,
      accounts: accounts.filter(
        (account) =>
          account.classification === 'business'
          && businessSpaceIdsForAccount(account).includes(space.id),
      ),
    }))
    .filter((group) => group.accounts.length > 0);

  const actions = { busyId, onEdit, onShare, onClose, onDelete };

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
      <div className="panel-heading"><div><span className="eyebrow">Not linked yet</span><h2>Business accounts</h2></div><span>{unassigned.length}</span></div>
      <AccountList accounts={unassigned} spaces={spaces} spaceIdOverride={spaceIdOverride} {...actions} />
    </section>}
  </div>;
}

function AccountList({
  accounts,
  spaces,
  spaceIdOverride,
  busyId,
  onEdit,
  onShare,
  onClose,
  onDelete,
}: {
  accounts: Account[];
  spaces: Space[];
  spaceIdOverride?: string;
  busyId: string;
  onEdit: (account: Account) => void;
  onShare: (account: Account) => void;
  onClose: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  const { user } = useAuth();
  const businessNames = (account: Account) => {
    const ids = businessSpaceIdsForAccount(account);
    if (!ids.length) return 'Not linked to a Business';
    return ids
      .map((id) => spaces.find((space) => space.id === id)?.name || 'Business')
      .join(', ');
  };

  return <section className="account-list">{accounts.map((account, index) => {
    const posCount = account.classification === 'business'
      ? posSpaceIdsForAccount(account).length
      : 0;
    const canManage = account.ownerId === user?.uid;
    const canViewBalance =
      canManage
      || account.sharedCanViewBalance === true;
    const canViewLedger =
      canManage
      || account.sharedCanViewLedger === true;

    return <article className={`account-card ${accountColorClass(getAccountColor(user?.uid || '', account.id, index))}`} key={account.id}>
      <span className={`account-symbol large ${account.type}`}>{account.name.charAt(0)}</span>
      <div className="account-main"><div><h2>{account.name}</h2><p>{institutionDisplay(account)} · {accountLabels[account.type]} · {account.classification === 'personal' ? 'Personal only' : businessNames(account)}{posCount > 0 ? ` · POS in ${posCount} Business${posCount === 1 ? '' : 'es'}` : ''}</p></div><small>{account.displayId}</small></div>
      <div className="account-balance">
        <span>Current balance</span>
        <strong>
          {canViewBalance
            ? formatMoney(account.ledgerBalanceMinor, account.currency)
            : 'Balance hidden'}
        </strong>
        {canViewBalance
          ? <small className="account-secondary-detail">Opening: {formatMoney(account.openingBalanceMinor, account.currency)}</small>
          : <small className="account-secondary-detail">The Business owner controls balance visibility.</small>}
      </div>
      <div className="account-actions">
        {canViewLedger && (
          <Link
            className="text-button account-view-activity"
            to={
              spaceIdOverride
                ? `/spaces/${spaceIdOverride}?section=money`
                : `/transactions?accountId=${encodeURIComponent(account.id)}`
            }
          >
            View activity
          </Link>
        )}
        {canManage && account.classification === 'business' && (
          <button className="text-button" onClick={() => onShare(account)}>Share</button>
        )}
        {canManage && (
          <button className="text-button" onClick={() => onEdit(account)}>Edit</button>
        )}
        {canManage && (
          <button className="text-button" disabled={busyId === account.id} onClick={() => onClose(account)}>Close</button>
        )}
        {canManage && (
          <button className="text-button danger" disabled={busyId === account.id} onClick={() => onDelete(account)}>Delete</button>
        )}
      </div>
    </article>;
  })}</section>;
}

type BusinessAccountShareRow = {
  space: Space;
  member: SpaceMember;
  canUseAccount: boolean;
  canViewBalance: boolean;
  canViewLedger: boolean;
};

function BusinessAccountShareModal({
  account,
  spaces,
  onClose,
}: {
  account: Account;
  spaces: Space[];
  onClose: () => void;
}) {
  const [rows, setRows] = useState<BusinessAccountShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const linkedIds = businessSpaceIdsForAccount(account);
  const linkedSpaces = spaces.filter((space) => linkedIds.includes(space.id));

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const [accessRows, memberGroups] = await Promise.all([
          listAccountAccess(account.id),
          Promise.all(linkedSpaces.map((space) => listSpaceMembers(space.id))),
        ]);

        if (!active) return;

        const accessByUid = new Map<string, AccountAccess>(
          accessRows.map((item) => [item.uid, item]),
        );

        const next: BusinessAccountShareRow[] = [];

        linkedSpaces.forEach((space, index) => {
          memberGroups[index]
            .filter(
              (member) =>
                member.uid !== account.ownerId
                && (member.status || 'active') === 'active',
            )
            .forEach((member) => {
              const access = accessByUid.get(member.uid);
              next.push({
                space,
                member,
                canUseAccount: Boolean(access?.usableSpaceIds?.includes(space.id)),
                canViewBalance: Boolean(access?.balanceSpaceIds?.includes(space.id)),
                canViewLedger: Boolean(access?.ledgerSpaceIds?.includes(space.id)),
              });
            });
        });

        setRows(next);
      } catch (nextError) {
        if (active) setError(getErrorMessage(nextError));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [account.id, account.ownerId, linkedIds.join('|')]);

  const patchRow = (
    spaceId: string,
    memberUid: string,
    patch: Partial<BusinessAccountShareRow>,
  ) => {
    setRows((current) => current.map((row) =>
      row.space.id === spaceId && row.member.uid === memberUid
        ? { ...row, ...patch }
        : row));
  };

  const saveRow = async (row: BusinessAccountShareRow) => {
    const key = row.space.id + '_' + row.member.uid;
    setBusyKey(key);
    setError('');
    try {
      await setBusinessAccountMemberAccess({
        accountId: account.id,
        spaceId: row.space.id,
        memberUid: row.member.uid,
        canUseAccount: row.canUseAccount,
        canViewBalance: row.canViewBalance,
        canViewLedger: row.canViewLedger,
      });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusyKey('');
    }
  };

  return <Modal title={`Share ${account.name}`} onClose={onClose}>
    <div className="form-stack">
      <div className="info-banner">
        <strong>Share only inside linked Business Spaces</strong>
        <span>The account keeps one real balance. Permissions below are separate for each Business Space. POS checkout access still follows that Business's POS role and POS-enabled account setting.</span>
      </div>
      {error && <div className="notice error">{error}</div>}
      {linkedSpaces.length === 0 && <div className="notice">Link this Business account to at least one Business Space from Edit account first.</div>}
      {loading ? <div className="loading-panel">Loading account access…</div> : rows.length === 0 && linkedSpaces.length > 0 ? <div className="notice">No other active members are available in the linked Business Spaces yet.</div> : rows.map((row) => {
        const key = row.space.id + '_' + row.member.uid;
        return <section className="panel" key={key}>
          <div className="panel-heading">
            <div><span className="eyebrow">{row.space.name}</span><h2>{row.member.displayName || row.member.email || 'Member'}</h2></div>
          </div>
          <div className="form-stack compact">
            <label className="checkbox-field">
              <input type="checkbox" checked={row.canUseAccount} onChange={(event) => patchRow(row.space.id, row.member.uid, { canUseAccount: event.target.checked })} />
              <span><strong>Can use account</strong><small>Can post Business money activity with this account in this Space.</small></span>
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={row.canViewBalance} onChange={(event) => patchRow(row.space.id, row.member.uid, { canViewBalance: event.target.checked })} />
              <span><strong>Can view balance</strong><small>Can see the account's current balance.</small></span>
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={row.canViewLedger} onChange={(event) => patchRow(row.space.id, row.member.uid, { canViewLedger: event.target.checked })} />
              <span><strong>Can view activity</strong><small>Can see activity for this account inside {row.space.name}.</small></span>
            </label>
          </div>
          <div className="modal-actions">
            <button className="button secondary" type="button" disabled={busyKey === key} onClick={() => void saveRow(row)}>
              {busyKey === key ? 'Saving…' : 'Save access'}
            </button>
          </div>
        </section>;
      })}
      <div className="modal-actions">
        <button className="button primary" type="button" onClick={onClose}>Done</button>
      </div>
    </div>
  </Modal>;
}
type AccountFormValues = {
  name: string;
  institution?: string;
  institutionCode?: InstitutionCode | null;
  type: AccountType;
  classification: AccountClassification;
  businessSpaceIds: string[];
  posSpaceIds: string[];
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
  const [businessSpaceIds, setBusinessSpaceIds] = useState<string[]>(
    () => initial ? businessSpaceIdsForAccount(initial) : [],
  );
  const [posSpaceIds, setPosSpaceIds] = useState<string[]>(
    () => initial ? posSpaceIdsForAccount(initial) : [],
  );
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
      setBusinessSpaceIds([]);
      setPosSpaceIds([]);
    }
  };

  const toggleBusinessSpace = (spaceId: string, enabled: boolean) => {
    setBusinessSpaceIds((current) =>
      enabled
        ? Array.from(new Set([...current, spaceId]))
        : current.filter((id) => id !== spaceId));
    if (!enabled) {
      setPosSpaceIds((current) => current.filter((id) => id !== spaceId));
    }
  };

  const togglePosSpace = (spaceId: string, enabled: boolean) => {
    setPosSpaceIds((current) =>
      enabled
        ? Array.from(new Set([...current, spaceId]))
        : current.filter((id) => id !== spaceId));
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
        businessSpaceIds: classification === 'business' ? businessSpaceIds : [],
        posSpaceIds: classification === 'business' ? posSpaceIds : [],
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
    {classification === 'business' && <fieldset className="span-2">
      <legend>Available in Business Spaces</legend>
      <div className="form-stack compact">
        {spaces.map((space) => {
          const linked = businessSpaceIds.includes(space.id);
          const posEnabledHere = posSpaceIds.includes(space.id);
          return <div className="panel" key={space.id}>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={linked}
                disabled={Boolean(space.archivedAt)}
                onChange={(event) => toggleBusinessSpace(space.id, event.target.checked)}
              />
              <span>
                <strong>{space.name}{space.archivedAt ? ' (Archived)' : ''}</strong>
                <small>Make this Business account available inside this Business Space.</small>
              </span>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={posEnabledHere}
                disabled={!linked || Boolean(space.archivedAt)}
                onChange={(event) => togglePosSpace(space.id, event.target.checked)}
              />
              <span>
                <strong>Allow POS payments in {space.name}</strong>
                <small>Cashiers can use it only when their POS role allows checkout. This does not automatically reveal the account balance.</small>
              </span>
            </label>
          </div>;
        })}
      </div>
      <small>A Business account is independent from a Space. Link the same account to as many of your Business Spaces as needed. You can also leave it unlinked and connect it later.</small>
    </fieldset>}
    {classification === 'business' && !spaces.some((space) => !space.archivedAt) && <div className="notice span-2">Create or restore an Business Space before adding a business account.</div>}
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
