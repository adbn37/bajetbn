import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { AccountAvatar } from './AccountAvatar';
import { AccountAvatarSettings } from './AccountAvatarSettings';
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
  BusinessAccountAccessLevel,
  AccountType,
  InstitutionCode,
  Space,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

const accountLabels: Record<AccountType, string> = { bank: 'Bank', cash: 'Cash', e_wallet: 'E-wallet', credit_card: 'Credit card' };
type AccountLifecycleAction = 'close' | 'delete';

type SharedAccountContext = {
  spaceIds: string[];
  usableSpaceIds: string[];
  balanceSpaceIds: string[];
  ledgerSpaceIds: string[];
  reportSpaceIds: string[];
};

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
  const [sharedAccountContext, setSharedAccountContext] = useState<Record<string, SharedAccountContext>>({});
  const [modal, setModal] = useState<'create' | 'edit' | 'link' | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [
    linkableBusinessAccounts,
    setLinkableBusinessAccounts,
  ] = useState<Account[]>([]);
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
              ? targetSpace.ownerId === user.uid
                ? await listAccountsForOwnerSpace(
                    user.uid,
                    spaceIdOverride,
                  )
                : []
              : await listAccountsForOwnerSpace(
                  user.uid,
                  spaceIdOverride,
                );

        if (
          targetSpace.type === 'sme'
          && targetSpace.ownerId === user.uid
        ) {
          const allOwned =
            await listAllAccounts(
              user.uid,
            );

          setLinkableBusinessAccounts(
            allOwned.filter(
              (account) =>
                account.classification
                  === 'business'
                && !account.archivedAt
                && !account.closedAt
                && !businessSpaceIdsForAccount(
                  account,
                ).includes(
                  spaceIdOverride,
                ),
            ),
          );
        } else {
          setLinkableBusinessAccounts([]);
        }

        setAccounts(nextAccounts);
        setSharedAccountContext({});
        setSpaces([targetSpace]);
        return;
      }

      const [
        ownedAccounts,
        nextSpaces,
      ] = await Promise.all([
        listAllAccounts(user.uid),
        listSpaces(user.uid),
      ]);

      const sharedSmeSpaces = nextSpaces.filter((space) => space.type === 'sme' && space.ownerId !== user.uid && !space.archivedAt);

      const sharedGroups = await Promise.all(
        sharedSmeSpaces.map(async (space) => ({
          space,
          accounts: await listAccountsForSpace(space.id).catch(() => [] as Account[]),
        })),
      );

      const sharedById = new Map<string, Account>();
      const nextSharedAccountContext: Record<string, SharedAccountContext> = {};

      sharedGroups.forEach(({ space, accounts: sharedAccounts }) => {
        sharedAccounts.forEach((account) => {
          const current = nextSharedAccountContext[account.id] || {
            spaceIds: [],
            usableSpaceIds: [],
            balanceSpaceIds: [],
            ledgerSpaceIds: [],
            reportSpaceIds: [],
          };

          const addSpace = (values: string[], enabled: boolean) =>
            enabled ? Array.from(new Set([...values, space.id])) : values;

          nextSharedAccountContext[account.id] = {
            spaceIds: addSpace(current.spaceIds, true),
            usableSpaceIds: addSpace(current.usableSpaceIds, account.sharedCanUseAccount === true),
            balanceSpaceIds: addSpace(current.balanceSpaceIds, account.sharedCanViewBalance === true),
            ledgerSpaceIds: addSpace(current.ledgerSpaceIds, account.sharedCanViewLedger === true),
            reportSpaceIds: addSpace(current.reportSpaceIds, account.sharedCanViewReports === true),
          };

          const existing = sharedById.get(account.id);
          if (!existing) {
            sharedById.set(account.id, account);
            return;
          }

          const incomingBalance = account.sharedCanViewBalance === true;
          const existingBalance = existing.sharedCanViewBalance === true;

          sharedById.set(account.id, {
            ...existing,
            ...(incomingBalance && !existingBalance ? {
              openingBalanceMinor: account.openingBalanceMinor,
              ledgerBalanceMinor: account.ledgerBalanceMinor,
            } : {}),
            sharedCanUseAccount:
              existing.sharedCanUseAccount === true
              || account.sharedCanUseAccount === true,
            sharedCanViewBalance:
              existingBalance || incomingBalance,
            sharedCanViewLedger:
              existing.sharedCanViewLedger === true
              || account.sharedCanViewLedger === true,
            sharedCanViewReports:
              existing.sharedCanViewReports === true
              || account.sharedCanViewReports === true,
          });
        });
      });

      setAccounts(
        [...ownedAccounts, ...sharedById.values()]
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setLinkableBusinessAccounts([]);
      setSharedAccountContext(nextSharedAccountContext);
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
      let cancelled = false;

      queueMicrotask(() => {
        if (!cancelled) void load();
      });

      return () => {
        cancelled = true;
      };
    },
    [spaceIdOverride, user],
  );

  const active = useMemo(() => accounts.filter((item) => !item.archivedAt && !item.closedAt), [accounts]);
  const ownedActive = useMemo(
    () => active.filter((item) => item.ownerId === user?.uid),
    [active, user?.uid],
  );
  const sharedActive = useMemo(
    () => active.filter((item) => item.ownerId !== user?.uid),
    [active, user?.uid],
  );
  const closed = useMemo(() => accounts.filter((item) => item.archivedAt || item.closedAt), [accounts]);
  const total = active
    .filter(
      (item) =>
        item.type !== 'credit_card'
        && (
          item.ownerId === user?.uid
          || item.sharedCanViewBalance === true
        ),
    )
    .reduce((sum, item) => sum + item.ledgerBalanceMinor, 0);
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
        item.ownerId === user?.uid
        && item.classification === 'business'
        && businessSpaceIdsForAccount(item).length === 0,
    ).length,
    [active],
  );

  const accountHeaderAction =
    embedded && !canManageEmbeddedAccounts
      ? null
      : embedded
        ? (
          <div className="page-header-action-row">
            {embeddedSpace?.type === 'sme' && (
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  setModal('link')
                }
              >
                Link existing
              </button>
            )}

            <button
              className="button primary"
              type="button"
              onClick={() =>
                setModal('create')
              }
            >
              {embeddedSpace?.type === 'sme'
                ? '+ New Business Account'
                : '+ Add account'}
            </button>
          </div>
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
              ? 'Accounts linked to this Business Space.'
              : 'Business Account management stays with the owner. Accounts shared with you appear on your main Accounts page.'
            : 'Accounts available to this Personal Space.'
          : 'One account can be used across multiple Spaces.'
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
            title={embeddedSpace?.type === 'sme' && !canManageEmbeddedAccounts ? 'Business Accounts are owner-managed' : 'Add your first account'}
            description={embeddedSpace?.type === 'sme' && !canManageEmbeddedAccounts ? 'Accounts shared with you appear on your main Accounts page instead of inside this Business Space.' : 'Start with BIBD, Baiduri, Cash, an e-wallet, or a credit card.'}
            action={canManageEmbeddedAccounts ? <button className="button primary" onClick={() => setModal('create')}>Add account</button> : undefined}
          />
        : <>
          <AccountGroups
            accounts={ownedActive}
            spaces={visibleSmeSpaces}
            spaceIdOverride={spaceIdOverride}
            busyId={busyId}
            onEdit={(account) => { setSelected(account); setModal('edit'); }}
            onShare={(account) => setSharing(account)}
            onClose={(account) => askLifecycle(account, 'close')}
            onDelete={(account) => askLifecycle(account, 'delete')}
            onUnlink={
              embeddedSpace?.type === 'sme'
              && canManageEmbeddedAccounts
                ? async (account) => {
                    const nextBusinessSpaceIds =
                      businessSpaceIdsForAccount(
                        account,
                      ).filter(
                        (id) =>
                          id !== embeddedSpace.id,
                      );

                    setBusyId(account.id);
                    setError('');

                    try {
                      await updateAccount({
                        accountId: account.id,
                        name: account.name,
                        institution:
                          account.institution,
                        institutionCode:
                          account.institutionCode,
                        type: account.type,
                        classification:
                          'business',
                        businessSpaceIds:
                          nextBusinessSpaceIds,
                        posSpaceIds:
                          nextBusinessSpaceIds,
                      });

                      await load();
                    } catch (nextError) {
                      setError(
                        getErrorMessage(
                          nextError,
                        ),
                      );
                    } finally {
                      setBusyId('');
                    }
                  }
                : undefined
            }
          />

          {!embedded && sharedActive.length > 0 && (
            <section className="shared-account-section">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Shared with me</span>
                  <h2>Shared accounts</h2>
                </div>
                <span>{sharedActive.length}</span>
              </div>
              <p className="muted">
                These accounts were shared with you by a Business owner. Balance, activity and money-use access follows the permissions they granted.
              </p>
              <AccountList
                accounts={sharedActive}
                spaces={spaces}
                busyId={busyId}
                onEdit={(account) => { setSelected(account); setModal('edit'); }}
                onShare={(account) => setSharing(account)}
                onClose={(account) => askLifecycle(account, 'close')}
                onDelete={(account) => askLifecycle(account, 'delete')}
                sharedAccountContext={sharedAccountContext}
              />
            </section>
          )}
        </>}

    {modal === 'link'
      && embeddedSpace?.type === 'sme'
      && canManageEmbeddedAccounts
      && (
        <Modal
          title={'Link Business Account to ' + embeddedSpace.name}
          onClose={() =>
            !busyId
            && setModal(null)
          }
        >
          <div className="form-stack">
            <div className="info-banner">
              <strong>
                Link a Global Business Account
              </strong>
              <span>
                Linking does not copy the account or its balance. The same real account can be linked to multiple Business Spaces while each Business keeps its own activity scope.
              </span>
            </div>

            {linkableBusinessAccounts.length > 0
              ? (
                <div className="business-account-link-list-v115">
                  {linkableBusinessAccounts.map(
                    (account) => (
                      <div
                        className="business-account-link-row-v115"
                        key={account.id}
                      >
                        <div>
                          <strong>{account.name}</strong>
                          <small>
                            {institutionDisplay(account)}
                            {' · '}
                            {formatMoney(
                              account.ledgerBalanceMinor,
                              account.currency,
                            )}
                          </small>
                        </div>

                        <button
                          className="button primary compact"
                          type="button"
                          disabled={
                            busyId === account.id
                          }
                          onClick={async () => {
                            setBusyId(account.id);
                            setError('');

                            try {
                              await updateAccount({
                                accountId:
                                  account.id,
                                name:
                                  account.name,
                                institution:
                                  account.institution,
                                institutionCode:
                                  account.institutionCode,
                                type:
                                  account.type,
                                classification:
                                  'business',
                                businessSpaceIds: [
                                  ...businessSpaceIdsForAccount(
                                    account,
                                  ),
                                  embeddedSpace.id,
                                ],
                                posSpaceIds: [
                                  ...businessSpaceIdsForAccount(
                                    account,
                                  ),
                                  embeddedSpace.id,
                                ],
                              });

                              setModal(null);
                              await load();
                            } catch (nextError) {
                              setError(
                                getErrorMessage(
                                  nextError,
                                ),
                              );
                            } finally {
                              setBusyId('');
                            }
                          }}
                        >
                          {busyId === account.id
                            ? 'Linking…'
                            : 'Link'}
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )
              : (
                <div className="empty-inline">
                  All active Global Business Accounts are already linked to this Business. Create a new Business Account if another one is needed.
                </div>
              )}

            <div className="modal-actions">
              <Link
                className="button secondary"
                to="/accounts"
              >
                Open Global Accounts
              </Link>

              <button
                className="button primary"
                type="button"
                disabled={Boolean(busyId)}
                onClick={() =>
                  setModal(null)
                }
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

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
        lockedClassification={
          embeddedSpace?.type === 'sme'
            ? 'business'
            : embeddedSpace?.type === 'personal'
              ? 'personal'
              : undefined
        }
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
        lockedClassification={
          embeddedSpace?.type === 'sme'
            ? 'business'
            : embeddedSpace?.type === 'personal'
              ? 'personal'
              : undefined
        }
        onClose={() => setModal(null)}
        onAvatarSaved={load}
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
  onUnlink,
}: {
  accounts: Account[];
  spaces: Space[];
  spaceIdOverride?: string;
  busyId: string;
  onEdit: (account: Account) => void;
  onShare: (account: Account) => void;
  onClose: (account: Account) => void;
  onDelete: (account: Account) => void;
  onUnlink?: (account: Account) => void | Promise<void>;
}) {
  const personal =
    accounts.filter(
      (account) =>
        account.classification === 'personal',
    );

  const business =
    accounts.filter(
      (account) =>
        account.classification === 'business',
    );

  const actions = {
    busyId,
    onEdit,
    onShare,
    onClose,
    onDelete,
    onUnlink,
  };

  return (
    <div className="form-stack">
      {personal.length > 0 && (
        <section>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Personal Account
              </span>
              <h2>Personal accounts</h2>
            </div>
            <span>{personal.length}</span>
          </div>

          <AccountList
            accounts={personal}
            spaces={spaces}
            spaceIdOverride={spaceIdOverride}
            {...actions}
          />
        </section>
      )}

      {business.length > 0 && (
        <section>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Business Account
              </span>
              <h2>
                {spaceIdOverride
                  ? 'Linked Business accounts'
                  : 'Business accounts'}
              </h2>
            </div>
            <span>{business.length}</span>
          </div>

          <AccountList
            accounts={business}
            spaces={spaces}
            spaceIdOverride={spaceIdOverride}
            {...actions}
          />
        </section>
      )}
    </div>
  );
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
  onUnlink,
  sharedAccountContext,
}: {
  accounts: Account[];
  spaces: Space[];
  spaceIdOverride?: string;
  busyId: string;
  onEdit: (account: Account) => void;
  onShare: (account: Account) => void;
  onClose: (account: Account) => void;
  onDelete: (account: Account) => void;
  onUnlink?: (account: Account) => void | Promise<void>;
  sharedAccountContext?: Record<string, SharedAccountContext>;
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
    const canManage = account.ownerId === user?.uid;
    const canViewBalance =
      canManage
      || account.sharedCanViewBalance === true;
    const canViewLedger =
      canManage
      || account.sharedCanViewLedger === true;
    const sharedContext = sharedAccountContext?.[account.id];
    const sharedSpaceNames = (sharedContext?.spaceIds || [])
      .map((id) => spaces.find((space) => space.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    const sharedLabel = sharedSpaceNames.length
      ? `Shared with me · ${sharedSpaceNames.join(', ')}`
      : 'Shared with me';
    const sharedLedgerSpaceId = sharedContext?.ledgerSpaceIds[0];

    return <article className={`account-card ${accountColorClass(getAccountColor(user?.uid || '', account.id, index))}`} key={account.id}>
      <AccountAvatar
        account={account}
        size="large"
      />
      <div className="account-main">
        <div>
          <h2>{account.name}</h2>
          <p>
            {institutionDisplay(account)}
            {' · '}
            {accountLabels[account.type]}
            {' · '}
            {canManage
              ? account.classification === 'personal'
                ? 'Personal Account'
                : spaceIdOverride
                  ? 'Business Account'
                  : businessSpaceIdsForAccount(account).length > 0
                    ? 'Business Account · Used by '
                      + businessSpaceIdsForAccount(account).length
                      + ' Business'
                      + (businessSpaceIdsForAccount(account).length === 1 ? '' : 'es')
                    : 'Business Account · Not linked'
              : sharedLabel}
          </p>
        </div>
      </div>
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
              canManage
                ? spaceIdOverride
                  ? `/spaces/${spaceIdOverride}/business/money`
                  : `/transactions?accountId=${encodeURIComponent(account.id)}`
                : sharedLedgerSpaceId
                  ? `/spaces/${sharedLedgerSpaceId}?section=money`
                  : '/accounts'
            }
          >
            View activity
          </Link>
        )}
        {canManage
          && account.classification === 'business'
          && onUnlink
          && spaceIdOverride
          && (
            <button
              className="text-button"
              disabled={busyId === account.id}
              onClick={() =>
                void onUnlink(account)
              }
            >
              Unlink from Business
            </button>
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
  accessLevel: BusinessAccountAccessLevel;
  canUseAccount: boolean;
  canViewBalance: boolean;
  canViewLedger: boolean;
  canViewReports: boolean;
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
                accessLevel:
                  access?.accessLevelBySpace?.[space.id]
                  || 'user',
                canUseAccount:
                  Boolean(
                    access?.usableSpaceIds?.includes(
                      space.id,
                    ),
                  ),
                canViewBalance:
                  Boolean(
                    access?.balanceSpaceIds?.includes(
                      space.id,
                    ),
                  ),
                canViewLedger:
                  Boolean(
                    access?.ledgerSpaceIds?.includes(
                      space.id,
                    ),
                  ),
                canViewReports:
                  Boolean(
                    access?.reportSpaceIds?.includes(
                      space.id,
                    ),
                  ),
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
        accessLevel: row.accessLevel,
        canUseAccount: row.canUseAccount,
        canViewBalance: row.canViewBalance,
        canViewLedger: row.canViewLedger,
        canViewReports: row.canViewReports,
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
        <span>The account keeps one real balance. Permissions below are separate for each Business Space. Linked Business accounts are automatically available to that Business POS; staff still need the correct POS role.</span>
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
            <label>
              Access level
              <select
                value={row.accessLevel}
                onChange={(event) =>
                  patchRow(
                    row.space.id,
                    row.member.uid,
                    {
                      accessLevel:
                        event.target.value as BusinessAccountAccessLevel,
                    },
                  )
                }
              >
                <option value="manager">
                  Manager
                </option>
                <option value="user">
                  User
                </option>
                <option value="viewer">
                  Viewer
                </option>
              </select>
              <small>
                The level describes responsibility. The switches below decide the exact access granted to this account.
              </small>
            </label>

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

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={row.canViewReports}
                onChange={(event) =>
                  patchRow(
                    row.space.id,
                    row.member.uid,
                    {
                      canViewReports:
                        event.target.checked,
                    },
                  )
                }
              />
              <span>
                <strong>
                  Can view full reports
                </strong>
                <small>
                  Allows this member to receive full Business report access without granting unrelated management permissions.
                </small>
              </span>
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

function AccountForm({
  currency,
  spaces,
  initial,
  lockedClassification,
  onClose,
  onAvatarSaved,
  onSubmit,
}: {
  currency: string;
  spaces: Space[];
  initial?: Account;
  lockedClassification?: AccountClassification;
  onClose: () => void;
  onAvatarSaved?: () => Promise<void>;
  onSubmit: (values: AccountFormValues) => Promise<void>;
}) {
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
    lockedClassification
      || initial?.classification
      || 'personal',
  );
  /*
   * Compatibility marker for the historical Personal module verifier.
   * Personal embedding still locks Personal scope, while Business embedding
   * now locks Business scope through lockedClassification.
   */
  const lockedPersonal =
    lockedClassification === 'personal';
  const [businessSpaceIds, setBusinessSpaceIds] = useState<string[]>(
    () => initial ? businessSpaceIdsForAccount(initial) : [],
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
    if (lockedClassification) return;

    setClassification(nextClassification);
    if (nextClassification === 'personal') {
      setBusinessSpaceIds([]);
    }
  };

  const toggleBusinessSpace = (spaceId: string, enabled: boolean) => {
    setBusinessSpaceIds((current) =>
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
        posSpaceIds: classification === 'business' ? businessSpaceIds : [],
        currency,
        openingBalanceMinor: initial ? initial.openingBalanceMinor : toMinorUnits(opening),
        color,
      });
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <Modal title={initial ? 'Edit account' : 'Add account'} onClose={onClose}><form className="form-grid" onSubmit={submit}>
    {error && <div className="notice error span-2">{error}</div>}
    {initial && onAvatarSaved && (
      <AccountAvatarSettings
        account={initial}
        onSaved={onAvatarSaved}
      />
    )}
    <label className="span-2">Account name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. BIBD Main" /></label>
    <label>Type<select value={type} onChange={(event) => changeType(event.target.value as AccountType)}><option value="bank">Bank</option><option value="cash">Cash</option><option value="e_wallet">E-wallet</option><option value="credit_card">Credit card</option></select></label>
    <label>Used for<select value={classification} disabled={Boolean(lockedClassification)} onChange={(event) => changeClassification(event.target.value as AccountClassification)}><option value="personal">Personal</option><option value="business">Business</option></select></label>
    {classification === 'business' && <fieldset className="span-2">
      <legend>Available in Business Spaces</legend>
      <div className="form-stack compact">
        {spaces.map((space) => {
          const linked = businessSpaceIds.includes(space.id);
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
          </div>;
        })}
      </div>
      <small>Link the same account to as many Business Spaces as needed. A linked account is automatically available to that Business POS; staff access still follows their POS role and account permissions.</small>
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
