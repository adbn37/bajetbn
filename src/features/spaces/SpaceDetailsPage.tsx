import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineSync } from '../../contexts/OfflineSyncContext';
import {
  listAccountsForOwnerSpace,
  listPersonalAccounts,
} from '../../repositories/accountRepository';
import {
  listAllCustomCategories,
} from '../../repositories/categoryRepository';
import {
  listBudgetsForOwnerSpace,
  listBudgetsForSpace,
} from '../../repositories/budgetRepository';
import {
  listCommitmentsForOwnerSpace,
  listCommitmentsForSpace,
} from '../../repositories/commitmentRepository';
import {
  listSharedBillAssignments,
  listSpaceMembers,
} from '../../repositories/collaborationRepository';
import { listGoalsForOwnerSpace } from '../../repositories/goalRepository';
import { listSharedExpenses } from '../../repositories/sharedExpenseRepository';
import { getMySmePosAccess } from '../../repositories/smePosRepository';
import { manageSpace } from '../../repositories/lifecycleRepository';
import { getSpace, updateSpace } from '../../repositories/spaceRepository';
import {
  listTransactionsForOwnerSpace,
  listTransactionsForSpace,
  postTransaction,
} from '../../repositories/transactionRepository';
import type {
  Account,
  Budget,
  Commitment,
  FinancialTransaction,
  SavingsGoal,
  SharedBillAssignment,
  SharedExpense,
  Space,
  SpaceMember,
  SpaceType,
  TransactionCategory,
  SmePosRole,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';
import { CollaborationPage, type CollaborationTab } from '../collaboration/CollaborationPage';
import { DEFAULT_TRANSACTION_CATEGORIES } from '../categories/defaultCategories';
import { MoneyActivityModal } from '../transactions/TransactionsPage';
import { SpaceChatPanel } from '../collaboration/SpaceChatPanel';
import { useSpacePresenceHeartbeat } from '../collaboration/useSpacePresence';
import { SpaceReminderAutomationPanel } from '../collaboration/SpaceReminderAutomationPanel';
import { SharedExpensesPanel } from './SharedExpensesPanel';
import { SpaceFundPanel } from './SpaceFundPanel';
import { SpaceActionHub } from './SpaceActionHub';
import { HouseholdCommandCentre } from './HouseholdCommandCentre';
import { TripCommandCentre } from './TripCommandCentre';
import { CUSTOM_SPACE_MODULE_OPTIONS, DEFAULT_CUSTOM_SPACE_MODULES, normalizeCustomSpaceModules } from './customSpaceModules';
import { CollectionCommandCentre } from './CollectionCommandCentre';
import { SmeOperationsCommandCentre } from './SmeOperationsCommandCentre';
import { SmeOperationalAttentionPanel } from './SmeOperationalAttentionPanel';
import { SpaceAvatar } from './SpaceAvatar';
import { SpaceAvatarSettings } from './SpaceAvatarSettings';

import type { CustomSpaceModule } from '../../types/models';

const EmbeddedAccountsPage = lazy(
  async () => {
    const module =
      await import('../accounts/AccountsPage');

    return {
      default: module.AccountsPage,
    };
  },
);

const EmbeddedBudgetsPage = lazy(
  async () => {
    const module =
      await import('../budgets/BudgetsPage');

    return {
      default: module.BudgetsPage,
    };
  },
);

const EmbeddedGoalsPage = lazy(
  async () => {
    const module =
      await import('../goals/GoalsPage');

    return {
      default: module.GoalsPage,
    };
  },
);

const EmbeddedCommitmentsPage = lazy(
  async () => {
    const module =
      await import('../commitments/CommitmentsPage');

    return {
      default: module.CommitmentsPage,
    };
  },
);

type SpaceDetailsTab = 'overview' | CollaborationTab | 'expenses' | 'balances' | 'trip_money' | 'group_fund' | 'chat';
type SpaceOverviewSection = 'accounts' | 'income' | 'expenses' | 'money' | 'budgets' | 'goals' | 'bills' | 'instalments' | 'reports' | 'calendar';
type SpaceReportRange = 'day' | 'week' | 'month' | 'year' | 'custom';

function localIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function reportWindow(range: SpaceReportRange, customFrom: string, customTo: string) {
  const now = new Date();
  let from = '';
  let to = localIsoDate(now);

  if (range === 'day') {
    from = to;
  } else if (range === 'week') {
    const dayFromMonday = (now.getDay() + 6) % 7;
    from = localIsoDate(addDays(now, -dayFromMonday));
  } else if (range === 'month') {
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  } else if (range === 'year') {
    from = `${now.getFullYear()}-01-01`;
  } else {
    from = customFrom || to;
    to = customTo || from;
  }

  if (from > to) return { from: to, to: from };
  return { from, to };
}

function displaySpaceDate(value?: string | null) {
  if (!value) return 'No date';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-BN', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}
const spaceTypeLabel: Record<SpaceType, string> = {
  personal: 'Personal',
  household: 'Household',
  sme: 'SME',
  trip: 'Trip',
  goal: 'Goal',
  collection: 'Collection',
  vehicle: 'Vehicle',
  property: 'Property',
  project: 'Project',
  event: 'Event',
  asset: 'Asset',
  custom: 'Custom',
};

function tabFromSearch(value: string | null, shared: boolean): SpaceDetailsTab {
  if (value === 'settings') return 'settings';
  if (shared && (value === 'approvals' || value === 'updates' || value === 'members' || value === 'bills' || value === 'expenses' || value === 'balances' || value === 'trip_money' || value === 'group_fund' || value === 'activity' || value === 'chat')) return value;
  return 'overview';
}

function spaceDescription(space: Space) {
  if (space.description) return space.description;
  if (space.type === 'personal') return 'Your private place for personal money.';
  if (space.type === 'household') return 'Manage household money, members, and shared bills together.';
  if (space.type === 'trip') return 'Keep trip spending, members, and shared payments in one place.';
  if (space.type === 'sme') return 'Keep business money separate from personal money.';
  if (space.type === 'goal') return 'Track money for a shared goal or project.';
  if (space.type === 'collection') return 'Organise collectibles, quantities, barcodes, labels, and storage locations.';
  if (space.type === 'vehicle') return 'Track fuel, servicing, insurance, repairs and other vehicle costs.';
  if (space.type === 'property') return 'Track rent, utilities, maintenance and other property money in one place.';
  if (space.type === 'project') return 'Keep project budgets, shared costs, goals and important dates together.';
  if (space.type === 'event') return 'Plan an event budget, shared contributions, spending and important dates together.';
  if (space.type === 'asset') return 'Track ownership costs, maintenance and spending connected to this asset.';
  return 'A separate place for this money activity.';
}

export function SpaceDetailsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { spaceId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [space, setSpace] = useState<Space | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [sharedBills, setSharedBills] = useState<SharedBillAssignment[]>([]);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [smePosRole, setSmePosRole] = useState<SmePosRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const shared = Boolean(space && space.type !== 'personal');
  const requestedTab = searchParams.get('tab');
  const requestedSection = searchParams.get('section');
  const detailedOverviewRequested =
    searchParams.get('details') === '1';
  const activeTab = tabFromSearch(requestedTab, shared);

  const load = useCallback(async () => {
    if (!user || !spaceId) return;

    setLoading(true);
    setError('');

    try {
      const nextSpace = await getSpace(spaceId);

      setSpace(nextSpace);

      // Clear tool-specific data whenever the Space/request context changes.
      setAccounts([]);
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setCommitments([]);
      setSharedBills([]);
      setSharedExpenses([]);

      if (!nextSpace) {
        setMembers([]);
        setSmePosRole(null);
        return;
      }

      const nextPosAccess =
        nextSpace.type === 'sme'
          ? await getMySmePosAccess(
              spaceId,
              user.uid,
            )
          : null;

      const nextSmePosRole: SmePosRole | null =
        nextSpace.type === 'sme'
          ? nextSpace.ownerId === user.uid
            ? 'owner'
            : nextPosAccess?.status === 'active'
              ? nextPosAccess.role
              : null
          : null;

      setSmePosRole(nextSmePosRole);

      /*
       * Member context remains part of the shared Space runtime.
       * Financial/report datasets are no longer automatically part
       * of the runtime.
       */
      const nextMembers =
        nextSpace.type !== 'personal'
          ? await listSpaceMembers(spaceId)
          : [];

      setMembers(nextMembers);

      const canReadSmeFinancials =
        nextSpace.type !== 'sme'
        || nextSpace.ownerId === user.uid
        || nextSmePosRole === 'owner'
        || nextSmePosRole === 'manager';

      const nextShared =
        nextSpace.type !== 'personal';

      const nextActiveTab =
        tabFromSearch(
          requestedTab,
          nextShared,
        );

      const nextCompactActionHome =
        nextSpace.type === 'personal'
        || nextSpace.type === 'sme'
        || nextSpace.type === 'household'
        || nextSpace.type === 'trip';

      /*
       * Household, Trip and SME launcher pages stay lightweight.
       *
       * Detailed financial data is requested only when:
       * - an overview section/report is opened; or
       * - Detailed overview is explicitly expanded.
       *
       * Other Space types preserve their current overview behavior,
       * but now use Space-scoped Firestore queries.
       */
      const fullEmbeddedSection =
        (
          nextSpace.type === 'personal'
          && [
            'accounts',
            'budgets',
            'goals',
            'bills',
            'instalments',
          ].includes(
            requestedSection || '',
          )
        )
        || (
          (
            nextSpace.type === 'household'
            || nextSpace.type === 'trip'
          )
          && requestedSection === 'budgets'
        )
        || (
          nextSpace.type === 'sme'
          && nextSpace.ownerId === user.uid
          && [
            'budgets',
            'bills',
          ].includes(
            requestedSection || '',
          )
        );

      const shouldLoadOverviewData =
        nextActiveTab === 'overview'
        && !fullEmbeddedSection
        && (
          !nextCompactActionHome
          || Boolean(requestedSection)
          || detailedOverviewRequested
        );

      if (
        shouldLoadOverviewData
        && canReadSmeFinancials
      ) {
        const nextAccountsPromise =
          nextSpace.type === 'personal'
            ? listPersonalAccounts(
                user.uid,
              )
            : listAccountsForOwnerSpace(
                user.uid,
                spaceId,
              );

        const nextGoalsPromise =
          listGoalsForOwnerSpace(
            user.uid,
            spaceId,
          );

        let nextTransactionsPromise:
          Promise<FinancialTransaction[]>;

        let nextBudgetsPromise:
          Promise<Budget[]>;

        let nextCommitmentsPromise:
          Promise<Commitment[]>;

        /*
         * Preserve the existing SME manager financial permission.
         * Managers use Space-authorized queries; owner data remains
         * owner + Space scoped.
         */
        if (
          nextSpace.type === 'sme'
          && nextSpace.ownerId !== user.uid
        ) {
          nextTransactionsPromise =
            listTransactionsForSpace(
              spaceId,
            );

          nextBudgetsPromise =
            listBudgetsForSpace(
              spaceId,
            );

          nextCommitmentsPromise =
            listCommitmentsForSpace(
              spaceId,
            );
        } else {
          nextTransactionsPromise =
            listTransactionsForOwnerSpace(
              user.uid,
              spaceId,
            );

          nextBudgetsPromise =
            listBudgetsForOwnerSpace(
              user.uid,
              spaceId,
            );

          nextCommitmentsPromise =
            listCommitmentsForOwnerSpace(
              user.uid,
              spaceId,
            );
        }

        const [
          nextAccounts,
          nextGoals,
          nextTransactions,
          nextBudgets,
          nextCommitments,
        ] = await Promise.all([
          nextAccountsPromise,
          nextGoalsPromise,
          nextTransactionsPromise,
          nextBudgetsPromise,
          nextCommitmentsPromise,
        ]);

        setAccounts(nextAccounts);
        setGoals(nextGoals);
        setTransactions(nextTransactions);
        setBudgets(nextBudgets);
        setCommitments(nextCommitments);

        if (nextShared) {
          const [
            nextSharedBills,
            nextSharedExpenses,
          ] = await Promise.all([
            listSharedBillAssignments(
              spaceId,
            ),
            listSharedExpenses(
              spaceId,
            ),
          ]);

          setSharedBills(
            nextSharedBills,
          );

          setSharedExpenses(
            nextSharedExpenses,
          );
        }
      }
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setLoading(false);
    }
  }, [
    detailedOverviewRequested,
    requestedSection,
    requestedTab,
    spaceId,
    user,
  ]);

  useEffect(() => { void load(); }, [load]);

  const activeTransactions = useMemo(
    () => transactions.filter((item) => item.status === 'posted' && item.type !== 'reversal'),
    [transactions],
  );
  const moneyIn = activeTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const moneyOut = activeTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const accountIdsUsed = new Set([
    ...activeTransactions.flatMap((item) => [item.accountId, item.destinationAccountId || '']),
    ...commitments.map((item) => item.accountId || ''),
  ].filter(Boolean));
  const accountsUsed = accounts.filter((item) => accountIdsUsed.has(item.id));
  const openBills = commitments.filter((item) => item.status === 'active');
  const openSharedBills = sharedBills.filter((item) => item.status !== 'paid');
  const openSharedExpenses = sharedExpenses.filter((item) => item.status !== 'paid');
  const activeMembers = members.filter((item) => (item.status || 'active') === 'active');
  const currentMember = members.find((item) => item.uid === user?.uid);

  useSpacePresenceHeartbeat({
    spaceId: space?.id || '',
    uid: user?.uid || '',
    enabled: Boolean(
      space
      && user
      && currentMember
      && space.type !== 'personal'
      && !space.archivedAt
      && (currentMember.status || 'active') === 'active',
    ),
  });
  const canViewSmeFinancials = !space
    || space.type !== 'sme'
    || space.ownerId === user?.uid
    || smePosRole === 'owner'
    || smePosRole === 'manager';

  function chooseTab(tab: SpaceDetailsTab) {
    setSearchParams(tab === 'overview' ? {} : { tab });
  }

  if (loading) return <main className="page"><div className="loading-panel">Loading Space…</div></main>;

  if (!space) {
    return <main className="page">
      <PageHeader eyebrow="Spaces" title="Space not found" description="This Space may have been removed, hidden, or is not available to your account." />
      {error && <div className="notice error">{error}</div>}
      <Link className="button primary" to="/spaces">Back to Spaces</Link>
    </main>;
  }

  const customModules =
    space.type === 'custom'
      ? normalizeCustomSpaceModules(space.customModules)
      : DEFAULT_CUSTOM_SPACE_MODULES;

  const supportsGroupFund =
    space.type === 'trip' ||
    space.type === 'household' ||
    space.type === 'project' ||
    space.type === 'event' ||
    (space.type === 'custom' && customModules.includes('group_fund'));
  const fundTabId: SpaceDetailsTab = space.type === 'trip' ? 'trip_money' : 'group_fund';
  const fundTabLabel = space.type === 'trip' ? 'Trip money' : space.type === 'household' ? 'Household fund' : space.type === 'event' ? 'Event fund' : space.type === 'project' ? 'Project fund' : 'Group fund';

  const sharedFinanceTabs: Array<{ id: SpaceDetailsTab; label: string }> =
    space.type === 'sme' && canViewSmeFinancials
      ? [
        { id: 'expenses', label: 'Expenses' },
        { id: 'bills', label: 'Shared bills' },
      ]
      : [];
  const tabs: Array<{ id: SpaceDetailsTab; label: string }> = shared
    ? [
      { id: 'overview', label: 'Overview' },
      { id: 'updates', label: 'Updates' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'members', label: 'Members' },
      { id: 'chat', label: 'Chat' },
      ...sharedFinanceTabs,
      { id: 'activity', label: 'Activity' },
      { id: 'settings', label: 'Space settings' },
    ]
    : [
      { id: 'overview', label: 'Overview' },
      { id: 'settings', label: 'Space settings' },
    ];

  const compactActionHome =
    space.type === 'personal'
    || space.type === 'sme'
    || space.type === 'household'
    || space.type === 'trip';

  return <main className="page space-details-page">
    <PageHeader
      eyebrow={`${spaceTypeLabel[space.type]} Space`}
      title={space.name}
      leading={<SpaceAvatar space={space} size="large" />}
      description={
        space.type === 'sme'
          ? `${currentMember?.role === 'owner' ? 'Owner' : currentMember?.role || 'Member'} · SME`
          : spaceDescription(space)
      }
      action={<Link className="button secondary" to="/spaces">Back</Link>}
    />
    {error && <div className="notice error">{error}</div>}
    {space.archivedAt && <div className="notice">This Space is hidden. Its previous money records are still kept.</div>}

    {space.type !== 'sme' && (
      <section className="space-details-identity">
        <SpaceAvatar space={space} size="large" />

        <div>
          <strong>{spaceTypeLabel[space.type]}</strong>
          <span>
            {shared
              ? `${currentMember?.role === 'owner' ? 'Owner' : currentMember?.role || 'Member'} · Shared Space`
              : 'Private Space'}
          </span>
        </div>

        <div className="space-details-meta">
          <span>{space.currency}</span>
          <span>Brunei time</span>
          <span>{space.displayId}</span>
        </div>
      </section>
    )}

    {space.type === 'collection' && !space.archivedAt && (
      <section className="sme-pos-hero collection-space-hero">
        <div className="sme-pos-hero-copy">
          <h2>Collection inventory</h2>
          <p>Scan barcodes, organise collectibles, and print internal labels.</p>
        </div>
        <div className="sme-pos-hero-actions">
          <Link className="button primary sme-pos-open-button" to={`/spaces/${space.id}/collection`}>
            Open collection
          </Link>
        </div>
      </section>
    )}

    {activeTab === 'overview' && (
      <SpaceActionHub
        space={space}
        members={members}
        currentMember={currentMember || null}
        supportsGroupFund={supportsGroupFund}
        fundLabel={fundTabLabel}
        smePosRole={smePosRole}
        canViewSmeFinancials={canViewSmeFinancials}
        onRefresh={load}
      />
    )}

    {activeTab === 'overview' && space.type === 'trip' && (
      <details
        open={detailedOverviewRequested}
        onToggle={(event) => {
          const next =
            new URLSearchParams(searchParams);

          if (event.currentTarget.open) {
            next.set('details', '1');
          } else {
            next.delete('details');
          }

          setSearchParams(
            next,
            { replace: true },
          );
        }}
        className="space-home-secondary-details"
        style={{ marginTop: '0.75rem' }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontWeight: 600,
            padding: '0.5rem 0',
          }}
        >
          Detailed Trip overview
        </summary>

        <div style={{ marginTop: '0.75rem' }}>
          {detailedOverviewRequested && (
            <TripCommandCentre
              space={space}
              budgets={budgets}
              members={members}
              currentMember={currentMember}
              sharedExpenses={sharedExpenses}
              onOpenTab={(tab) => chooseTab(tab)}
            />
          )}
        </div>
      </details>
    )}


    {activeTab === 'overview' && space.type === 'household' && (
      <details
        open={detailedOverviewRequested}
        onToggle={(event) => {
          const next =
            new URLSearchParams(searchParams);

          if (event.currentTarget.open) {
            next.set('details', '1');
          } else {
            next.delete('details');
          }

          setSearchParams(
            next,
            { replace: true },
          );
        }}
        className="space-home-secondary-details"
        style={{ marginTop: '0.75rem' }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontWeight: 600,
            padding: '0.5rem 0',
          }}
        >
          Detailed Household overview
        </summary>

        <div style={{ marginTop: '0.75rem' }}>
          {detailedOverviewRequested && (
            <HouseholdCommandCentre
              space={space}
              members={members}
              commitments={commitments}
              sharedBills={sharedBills}
              sharedExpenses={sharedExpenses}
              currentMember={currentMember || null}
              canManage={
                currentMember?.role === 'owner'
                || currentMember?.role === 'admin'
              }
              onOpenTab={chooseTab}
            />
          )}
        </div>
      </details>
    )}

    {activeTab === 'overview' && space.type === 'sme' && (
      <details
        open={detailedOverviewRequested}
        onToggle={(event) => {
          const next =
            new URLSearchParams(searchParams);

          if (event.currentTarget.open) {
            next.set('details', '1');
          } else {
            next.delete('details');
          }

          setSearchParams(
            next,
            { replace: true },
          );
        }}
        className="space-home-secondary-details"
        style={{ marginTop: '0.75rem' }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontWeight: 600,
            padding: '0.5rem 0',
          }}
        >
          Detailed SME overview
        </summary>

        <div style={{ marginTop: '0.75rem' }}>
          {detailedOverviewRequested && (
            <SmeOperationsCommandCentre
              space={space}
              role={smePosRole}
              canViewFinancials={canViewSmeFinancials}
              accounts={accounts}
              transactions={transactions}
              commitments={commitments}
              memberCount={activeMembers.length}
            />
          )}
        </div>
      </details>
    )}

    {activeTab === 'overview' && space.type === 'sme' && (
      <SmeOperationalAttentionPanel
        space={space}
        role={smePosRole}
      />
    )}
    {activeTab === 'overview' && space.type === 'collection' && (
      <CollectionCommandCentre space={space} />
    )}
    {(!compactActionHome || activeTab !== 'overview') && (
      <nav className="space-details-tabs" aria-label="Space sections">
      {tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => chooseTab(tab.id)}>{tab.label}</button>)}
      {space.type === 'sme' && <Link className="space-details-tab-link" to={`/spaces/${space.id}/pos`}>Point of sale</Link>}
      {space.type === 'collection' && <Link className="space-details-tab-link" to={`/spaces/${space.id}/collection`}>Collection</Link>}
      </nav>
    )}

    {activeTab === 'overview' ? <SpaceOverview
      space={space}
      moneyIn={moneyIn}
      moneyOut={moneyOut}
      accounts={accounts}
      accountsUsed={accountsUsed}
      transactions={transactions}
      budgets={budgets}
      goals={goals}
      commitments={commitments}
      openBills={openBills}
      memberCount={activeMembers.length}
      openSharedBillCount={openSharedBills.length + openSharedExpenses.length}
      canViewFinancials={canViewSmeFinancials}
      smePosRole={smePosRole}
      onRefresh={load}
    /> : shared && activeTab === 'expenses' ? <SharedExpensesPanel space={space} members={members} currentMember={currentMember || null} canManage={currentMember?.role === 'owner' || currentMember?.role === 'admin'} view="expenses" /> : shared && activeTab === 'balances' ? <SharedExpensesPanel space={space} members={members} currentMember={currentMember || null} canManage={currentMember?.role === 'owner' || currentMember?.role === 'admin'} view="balances" /> : shared && supportsGroupFund && (activeTab === 'trip_money' || activeTab === 'group_fund') ? <SpaceFundPanel space={space} members={members} currentMember={currentMember || null} canManage={currentMember?.role === 'owner' || currentMember?.role === 'admin'} /> : shared ? <>
      {activeTab === 'chat' ? (
          <SpaceChatPanel
            space={space}
            members={members}
            currentMember={currentMember || null}
          />
        ) : (
          <CollaborationPage
            embedded
            spaceIdOverride={space.id}
            activeTab={activeTab as CollaborationTab}
            onSpaceUpdated={load}
          />
        )}
  {activeTab === 'settings'
    && currentMember
    && (currentMember.status || 'active') === 'active'
    && <SpaceReminderAutomationPanel
      space={space}
      currentMember={currentMember}
    />}
      {activeTab === 'settings' && currentMember?.role === 'owner' && <>
      <SpaceAvatarSettings space={space} onSaved={load} />
      {space.type === 'custom' && <CustomSpaceModuleSettings space={space} onSaved={load} />}
      <SpaceLifecyclePanel space={space} onFinished={() => navigate('/spaces')} />
    </>}
    </> : <>
      {activeTab === 'settings' && space.ownerId === user?.uid && (
        <SpaceAvatarSettings
          space={space}
          onSaved={load}
        />
      )}

      <PersonalSpaceSettings space={space} />
    </>}
  </main>;
}

function SpaceOverview({
  space,
  moneyIn,
  moneyOut,
  accounts,
  accountsUsed,
  transactions,
  budgets,
  goals,
  commitments,
  openBills,
  memberCount,
  openSharedBillCount,
  canViewFinancials,
  smePosRole,
  onRefresh,
}: {
  space: Space;
  moneyIn: number;
  moneyOut: number;
  accounts: Account[];
  accountsUsed: Account[];
  transactions: FinancialTransaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  commitments: Commitment[];
  openBills: Commitment[];
  memberCount: number;
  openSharedBillCount: number;
  canViewFinancials: boolean;
  smePosRole: SmePosRole | null;
  onRefresh: () => Promise<void>;
}) {
  const shared = space.type !== 'personal';

  const {
    user,
    profile,
  } = useAuth();

  const {
    online,
  } = useOfflineSync();

  const usesFullBudgetModule =
    space.type === 'personal'
    || space.type === 'household'
    || space.type === 'trip'
    || (
      space.type === 'sme'
      && space.ownerId === user?.uid
    );

  const usesFullCommitmentModule =
    space.type === 'personal'
    || (
      space.type === 'sme'
      && space.ownerId === user?.uid
    );

  const [
    personalMoneyType,
    setPersonalMoneyType,
  ] = useState<
    'income'
    | 'expense'
    | null
  >(null);

  const [
    personalCustomCategories,
    setPersonalCustomCategories,
  ] = useState<TransactionCategory[]>([]);

  const [
    personalMoneyLoading,
    setPersonalMoneyLoading,
  ] = useState(false);

  const personalCategories = useMemo(
    () => [
      ...DEFAULT_TRANSACTION_CATEGORIES,
      ...personalCustomCategories.filter(
        (item) =>
          !item.archivedAt,
      ),
    ],
    [personalCustomCategories],
  );

  const reloadPersonalCategories =
    useCallback(
      async () => {
        if (!user) {
          return personalCategories;
        }

        const next =
          await listAllCustomCategories(
            user.uid,
          );

        setPersonalCustomCategories(
          next,
        );

        return [
          ...DEFAULT_TRANSACTION_CATEGORIES,
          ...next.filter(
            (item) =>
              !item.archivedAt,
          ),
        ];
      },
      [
        personalCategories,
        user,
      ],
    );

  async function openPersonalMoney(
    type: 'income' | 'expense',
  ) {
    if (!user) return;

    setPersonalMoneyLoading(true);

    try {
      await reloadPersonalCategories();
      setPersonalMoneyType(type);
    } finally {
      setPersonalMoneyLoading(false);
    }
  }
  const customModules =
    space.type === 'custom'
      ? normalizeCustomSpaceModules(space.customModules)
      : DEFAULT_CUSTOM_SPACE_MODULES;
  const [
    overviewSearchParams,
    setOverviewSearchParams,
  ] = useSearchParams();
  const requestedSection = overviewSearchParams.get('section');
  const requestedOverviewSection =
    requestedSection
    && [
      'accounts',
      'income',
      'expenses',
      'money',
      'budgets',
      'goals',
      'bills',
      'instalments',
      'reports',
      'calendar',
    ].includes(requestedSection)
      ? requestedSection as SpaceOverviewSection
      : null;

  const [section, setSection] = useState<SpaceOverviewSection | null>(
    requestedOverviewSection,
  );
  const [reportRange, setReportRange] = useState<SpaceReportRange>('month');

  useEffect(() => {
    if (requestedOverviewSection) {
      setSection(requestedOverviewSection);
    }
  }, [requestedOverviewSection]);

  function closeOverviewSection() {
    const next =
      new URLSearchParams(
        overviewSearchParams,
      );

    next.delete('section');
    setSection(null);

    setOverviewSearchParams(
      next,
      { replace: true },
    );
  }
  const today = localIsoDate(new Date());
  const [customFrom, setCustomFrom] = useState(`${today.slice(0, 8)}01`);
  const [customTo, setCustomTo] = useState(today);

  type QuickItem = {
    key: string;
    icon: string;
    title: string;
    detail: string;
    featured?: boolean;
    to?: string;
    section?: SpaceOverviewSection;
  };

  const quickLinks: QuickItem[] = canViewFinancials ? [
    { key: 'money', section: 'money', icon: '↔', title: 'Money activity', detail: 'See only money activity saved in this Space.' },
    { key: 'budgets', section: 'budgets', icon: '▤', title: space.type === 'trip' ? 'Trip budget' : space.type === 'event' ? 'Event budget' : space.type === 'project' ? 'Project budget' : space.type === 'property' ? 'Property budget' : space.type === 'vehicle' ? 'Vehicle budget' : space.type === 'asset' ? 'Asset budget' : 'Budgets', detail: 'Review budgets connected to this Space.' },
    { key: 'bills', section: 'bills', icon: '◷', title: 'Bills & instalments', detail: 'See only bills and instalments for this Space.' },
    { key: 'reports', section: 'reports', icon: '⌁', title: 'Money reports', detail: 'Weekly, monthly, yearly or custom dates for this Space.' },
    { key: 'calendar', section: 'calendar', icon: '▦', title: 'Calendar', detail: 'See dates and deadlines belonging to this Space.' },
  ] : [];

  if (space.type === 'sme') {
    quickLinks.unshift({ key: 'pos', to: `/spaces/${space.id}/pos`, icon: '▣', title: 'Point of sale', detail: 'Open the register and daily shop tools.', featured: true });
  }

  if (space.type === 'collection') {
    quickLinks.unshift({ key: 'collection', to: `/spaces/${space.id}/collection`, icon: 'C', title: 'Collection inventory', detail: 'Scan, find, label, and organise collectibles.', featured: true });
  }

  if (space.type === 'personal' || space.type === 'goal' || space.type === 'project' || space.type === 'event' || space.type === 'custom') {
    quickLinks.splice(Math.min(2, quickLinks.length), 0, { key: 'goals', section: 'goals', icon: '◇', title: 'Goals', detail: 'Review savings goals connected to this Space.' });
  }

  const accountName = (accountId?: string | null) => {
    if (!accountId) return 'No account';
    return accountsUsed.find((item) => item.id === accountId)?.name || 'Account';
  };

  if (space.type === 'custom') {
    const enabledKeys = new Set<string>(['money', ...customModules]);

    for (let index = quickLinks.length - 1; index >= 0; index -= 1) {
      if (!enabledKeys.has(quickLinks[index].key)) {
        quickLinks.splice(index, 1);
      }
    }
  }

  const moneyRows = [...transactions].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  const accountRows = [...accounts]
    .sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  const incomeRows = moneyRows
    .filter((item) =>
      item.status === 'posted'
      && item.type === 'income',
    );
  const expenseRows = moneyRows
    .filter((item) =>
      item.status === 'posted'
      && item.type === 'expense',
    );
  const personalFlowRows =
    section === 'income'
      ? incomeRows
      : section === 'expenses'
        ? expenseRows
        : [];
  const billRows = [...commitments].sort((a, b) =>
    (a.nextDueDate || a.endDate || '9999-12-31').localeCompare(b.nextDueDate || b.endDate || '9999-12-31'),
  );
  const billsOnlyRows =
    space.type === 'personal'
      ? billRows.filter(
          (item) =>
            item.type !== 'instalment',
        )
      : billRows;
  const instalmentRows =
    billRows.filter(
      (item) =>
        item.type === 'instalment',
    );
  const budgetRows = [...budgets].sort((a, b) => b.endDate.localeCompare(a.endDate));
  const goalRows = [...goals].sort((a, b) => (a.targetDate || '9999-12-31').localeCompare(b.targetDate || '9999-12-31'));

  const window = reportWindow(reportRange, customFrom, customTo);
  const reportTransactions = transactions.filter((item) =>
    item.status === 'posted'
    && item.type !== 'reversal'
    && item.transactionDate >= window.from
    && item.transactionDate <= window.to,
  );
  const reportIncome = reportTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountMinor, 0);
  const reportExpense = reportTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const expenseByCategory = Array.from(reportTransactions
    .filter((item) => item.type === 'expense')
    .reduce((totals, item) => {
      const key = item.category || 'Uncategorised';
      totals.set(key, (totals.get(key) || 0) + item.amountMinor);
      return totals;
    }, new Map<string, number>()))
    .sort((a, b) => b[1] - a[1]);

  const calendarRows: Array<{ id: string; date: string; label: string; detail: string; kind: string }> = [
    ...commitments
      .filter((item) => item.status === 'active' && Boolean(item.nextDueDate || item.startDate))
      .map((item) => ({
        id: `bill-${item.id}`,
        date: item.nextDueDate || item.startDate,
        label: item.name,
        detail: `${item.type === 'instalment' ? 'Instalment' : 'Bill'} · ${formatMoney(item.amountMinor, item.currency)}`,
        kind: 'Payment due',
      })),
    ...goals
      .filter((item) => item.status === 'active' && Boolean(item.targetDate))
      .map((item) => ({
        id: `goal-${item.id}`,
        date: item.targetDate || '',
        label: item.name,
        detail: `Goal target · ${formatMoney(item.targetMinor, item.currency)}`,
        kind: 'Goal',
      })),
    ...budgets
      .filter((item) => Boolean(item.endDate))
      .map((item) => ({
        id: `budget-${item.id}`,
        date: item.endDate,
        label: item.name,
        detail: `Budget period ends · ${formatMoney(item.limitMinor, item.currency)}`,
        kind: 'Budget',
      })),
  ].filter((item) => Boolean(item.date)).sort((a, b) => a.date.localeCompare(b.date));

  const sectionTitle: Record<SpaceOverviewSection, string> = {
    accounts:
      space.type === 'sme'
        ? 'Business Accounts'
        : 'Accounts',
    income: 'Income',
    expenses: 'Expenses',
    money: 'Money activity',
    budgets:
      space.type === 'personal'
        ? 'Budget'
        : space.type === 'trip'
          ? 'Trip budget'
          : space.type === 'event'
            ? 'Event budget'
            : space.type === 'project'
              ? 'Project budget'
              : space.type === 'property'
                ? 'Property budget'
                : space.type === 'vehicle'
                  ? 'Vehicle budget'
                  : space.type === 'asset'
                    ? 'Asset budget'
                    : 'Budgets',
    goals: 'Goals',
    bills:
      space.type === 'personal'
        ? 'Bills'
        : 'Bills & instalments',
    instalments: 'Instalments',
    reports: 'Money reports',
    calendar: 'Calendar',
  };

  const smeRoleLabel = smePosRole === 'manager'
    ? 'Manager'
    : smePosRole === 'cashier'
      ? 'Cashier'
      : smePosRole === 'stock_staff'
        ? 'Stock Staff'
        : smePosRole === 'seller'
          ? 'Seller'
          : smePosRole === 'viewer'
            ? 'View Only'
            : smePosRole === 'owner'
              ? 'Owner'
              : 'Staff';

  const usesCompactActionHome = (
    ['personal', 'sme', 'household', 'trip']
  ).includes(space.type);

  if (usesCompactActionHome && !section) {
    return null;
  }

  return <>
    {space.type === 'sme' && !canViewFinancials ? (
      <>
        <section className="sme-finance-private">
          <article className="summary-card featured"><span>Your role</span><strong>{smeRoleLabel}</strong><small>SME operational access</small></article>
          <article className="summary-card"><span>Members</span><strong>{memberCount}</strong><small>Active people in this Space</small></article>
          <article className="summary-card"><span>Daily workspace</span><strong>POS</strong><small>Sales and shop tools stay available</small></article>
        </section>
        <div className="notice sme-finance-private-note"><strong>Financial management is private</strong><span>Money activity, budgets, bills and money reports are shown to the Owner and Manager by default.</span></div>
      </>
    ) : (
      <section className="summary-grid space-overview-summary">
      <article className="summary-card featured"><span>Money in</span><strong>{formatMoney(moneyIn, space.currency)}</strong><small>Saved in this Space</small></article>
      <article className="summary-card"><span>Money out</span><strong>{formatMoney(moneyOut, space.currency)}</strong><small>Saved spending in this Space</small></article>
      <article className="summary-card"><span>{shared ? 'Members' : 'Accounts used'}</span><strong>{shared ? memberCount : accountsUsed.length}</strong><small>{shared ? 'Active people in this Space' : 'Accounts connected through money activity'}</small></article>
      <article className="summary-card"><span>{shared ? 'Shared items still open' : 'Bills still open'}</span><strong>{shared ? openSharedBillCount : openBills.length}</strong><small>Items that still need attention</small></article>
      </section>
    )}

    {shared && canViewFinancials && <div className="info-banner"><strong>This Space stays focused</strong><span>Money, bills, reports and calendar opened here are limited to {space.name}.</span></div>}

    <section className="panel space-overview-panel">
      <div className="panel-heading"><div><span className="eyebrow">Open a section</span><h2>Manage this Space</h2></div></div>
      <div className="space-quick-grid">
        {quickLinks.map((item) => {
          const content = <>
            <span className="space-quick-icon">{item.icon}</span>
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            <span aria-hidden="true">→</span>
          </>;

          return item.to
            ? <Link key={item.key} className={`space-quick-card ${item.featured ? 'featured' : ''}`} to={item.to}>{content}</Link>
            : <button key={item.key} type="button" className={`space-quick-card space-quick-card-button ${item.featured ? 'featured' : ''}`} onClick={() => setSection(item.section || null)}>{content}</button>;
        })}
      </div>
    </section>

    {canViewFinancials && (
      <section className="space-overview-grid">
        <article className="panel compact-panel"><span className="eyebrow">Planning</span><h2>{budgets.length} budget{budgets.length === 1 ? '' : 's'}</h2><p>{goals.length} savings goal{goals.length === 1 ? '' : 's'} connected to this Space.</p></article>
        <article className="panel compact-panel"><span className="eyebrow">Payments</span><h2>{openBills.length} bill{openBills.length === 1 ? '' : 's'} still open</h2><p>Open Bills & instalments above to review only this Space.</p></article>
        <article className="panel compact-panel"><span className="eyebrow">Accounts used here</span><h2>{accountsUsed.length}</h2>{accountsUsed.length ? <p>{accountsUsed.slice(0, 3).map((item) => item.name).join(', ')}</p> : <p>Record money activity to connect an account to this Space.</p>}</article>
      </section>
    )}

    {section && canViewFinancials && <Modal title={`${space.name} — ${sectionTitle[section]}`} onClose={closeOverviewSection}>
      <div className="space-scoped-modal">
        <div className="space-scoped-context">
          <strong>{space.name}</strong>
          <span>
            Only records from this Space are shown.
          </span>
        </div>

        {space.type === 'personal'
          && (
            section === 'income'
            || section === 'expenses'
          )
          && (
            <div className="personal-module-primary-action">
              <button
                type="button"
                className="button primary"
                disabled={personalMoneyLoading}
                onClick={() =>
                  void openPersonalMoney(
                    section === 'income'
                      ? 'income'
                      : 'expense',
                  )
                }
              >
                {personalMoneyLoading
                  ? 'Loading…'
                  : section === 'income'
                    ? 'Add Income'
                    : 'Add Expense'}
              </button>
            </div>
          )}

        {space.type === 'personal'
          && section === 'accounts'
          && (
            <Suspense
              fallback={
                <div className="loading-panel">
                  Loading Accounts…
                </div>
              }
            >
              <EmbeddedAccountsPage
                embedded
                spaceIdOverride={space.id}
              />
            </Suspense>
          )}

        {usesFullBudgetModule
          && section === 'budgets'
          && (
            <Suspense
              fallback={
                <div className="loading-panel">
                  Loading Budget…
                </div>
              }
            >
              <EmbeddedBudgetsPage
                embedded
                spaceIdOverride={space.id}
              />
            </Suspense>
          )}

        {space.type === 'personal'
          && section === 'goals'
          && (
            <Suspense
              fallback={
                <div className="loading-panel">
                  Loading Goals…
                </div>
              }
            >
              <EmbeddedGoalsPage
                embedded
                spaceIdOverride={space.id}
              />
            </Suspense>
          )}

        {space.type === 'personal'
          && section === 'bills'
          && (
            <Suspense
              fallback={
                <div className="loading-panel">
                  Loading Bills…
                </div>
              }
            >
              <EmbeddedCommitmentsPage
                embedded
                spaceIdOverride={space.id}
                typeOverride="bill"
              />
            </Suspense>
          )}

        {space.type === 'personal'
          && section === 'instalments'
          && (
            <Suspense
              fallback={
                <div className="loading-panel">
                  Loading Instalments…
                </div>
              }
            >
              <EmbeddedCommitmentsPage
                embedded
                spaceIdOverride={space.id}
                typeOverride="instalment"
              />
            </Suspense>
          )}

        {space.type !== 'personal' && section === 'accounts' && (
          <div className="space-scoped-list personal-space-account-list">
            {accountRows.length
              ? accountRows.map(
                  (item) => (
                    <article
                      key={item.id}
                      className="space-scoped-row"
                    >
                      <div>
                        <strong>
                          {item.name}
                        </strong>
                        <small>
                          {item.institution
                            || item.type.replace(
                              '_',
                              ' ',
                            )}
                          {' · '}
                          {item.currency}
                        </small>
                      </div>

                      <div className="space-scoped-amount">
                        <strong>
                          {formatMoney(
                            item.ledgerBalanceMinor,
                            item.currency,
                          )}
                        </strong>
                        <small>
                          Current balance
                        </small>
                      </div>
                    </article>
                  ),
                )
              : (
                <EmptyState
                  title={
                    space.type === 'sme'
                      ? 'No business accounts in this Space'
                      : 'No accounts in this Space'
                  }
                  description={
                    space.type === 'sme'
                      ? `Create or assign a Business Account to ${space.name} to keep business money inside this SME Space.`
                      : 'Create or assign an account to this Space to start tracking money here.'
                  }
                />
              )}
          </div>
        )}

        {(section === 'income'
          || section === 'expenses') && (
          <div className="space-scoped-list personal-space-flow-list">
            {personalFlowRows.length
              ? personalFlowRows.map(
                  (item) => (
                    <article
                      key={item.id}
                      className="space-scoped-row"
                    >
                      <div>
                        <strong>
                          {item.counterparty
                            || item.category
                            || (
                              section === 'income'
                                ? 'Income'
                                : 'Expense'
                            )}
                        </strong>
                        <small>
                          {displaySpaceDate(
                            item.transactionDate,
                          )}
                          {' · '}
                          {accountName(
                            item.accountId,
                          )}
                        </small>
                      </div>

                      <div className="space-scoped-amount">
                        <strong>
                          {section === 'income'
                            ? '+'
                            : '-'}
                          {formatMoney(
                            item.amountMinor,
                            item.currency,
                          )}
                        </strong>
                        <small>
                          {item.category
                            || (
                              section === 'income'
                                ? 'Money in'
                                : 'Money out'
                            )}
                        </small>
                      </div>
                    </article>
                  ),
                )
              : (
                <EmptyState
                  title={
                    section === 'income'
                      ? 'No income in this Personal Space'
                      : 'No expenses in this Personal Space'
                  }
                  description={
                    section === 'income'
                      ? 'Use Add Income above or the centred + button to record money in.'
                      : 'Use Add Expense above or the centred + button to record money out.'
                  }
                />
              )}
          </div>
        )}

        {section === 'money' && <>
          <div className="space-scoped-summary">
            <div><span>Money in</span><strong>{formatMoney(moneyIn, space.currency)}</strong></div>
            <div><span>Money out</span><strong>{formatMoney(moneyOut, space.currency)}</strong></div>
            <div><span>Net</span><strong>{formatMoney(moneyIn - moneyOut, space.currency)}</strong></div>
          </div>
          <div className="space-scoped-list">
            {moneyRows.length ? moneyRows.map((item) => <article key={item.id} className="space-scoped-row">
              <div>
                <strong>{item.counterparty || item.category || (item.type === 'transfer' ? 'Transfer' : 'Money activity')}</strong>
                <small>{displaySpaceDate(item.transactionDate)} · {accountName(item.accountId)}{item.destinationAccountId ? ` → ${accountName(item.destinationAccountId)}` : ''}</small>
              </div>
              <div className="space-scoped-amount">
                <strong>{item.type === 'income' ? '+' : item.type === 'expense' ? '-' : ''}{formatMoney(item.amountMinor, item.currency)}</strong>
                <small>{item.status === 'reversed' ? 'Reversed' : item.type}</small>
              </div>
            </article>) : <EmptyState title="No money activity in this Space" description="Use the actions above to record the first money activity for this Space." />}
          </div>
        </>}

        {!usesFullBudgetModule && section === 'budgets' && <div className="space-scoped-list">
          {budgetRows.length ? budgetRows.map((item) => {
            const remaining = item.limitMinor - item.spentMinor;
            return <article key={item.id} className="space-scoped-row">
              <div><strong>{item.name}</strong><small>{displaySpaceDate(item.startDate)} – {displaySpaceDate(item.endDate)}{item.categoryName ? ` · ${item.categoryName}` : ''}</small></div>
              <div className="space-scoped-amount"><strong>{formatMoney(item.spentMinor, item.currency)} / {formatMoney(item.limitMinor, item.currency)}</strong><small>{formatMoney(remaining, item.currency)} remaining</small></div>
            </article>;
          }) : <EmptyState title="No budgets in this Space" description="Create a Budget for this Space to start planning its spending." />}
        </div>}

        {space.type !== 'personal' && section === 'goals' && <div className="space-scoped-list">
          {goalRows.length ? goalRows.map((item) => <article key={item.id} className="space-scoped-row">
            <div><strong>{item.name}</strong><small>{item.targetDate ? `Target ${displaySpaceDate(item.targetDate)}` : 'No target date'} · {item.status}</small></div>
            <div className="space-scoped-amount"><strong>{formatMoney(item.currentMinor, item.currency)} / {formatMoney(item.targetMinor, item.currency)}</strong><small>{Math.max(0, Math.min(100, item.targetMinor > 0 ? Math.round((item.currentMinor / item.targetMinor) * 100) : 0))}%</small></div>
          </article>) : <EmptyState title="No goals in this Space" description="Create a goal for this Space to start tracking progress." />}
        </div>}

        {!usesFullCommitmentModule && section === 'bills' && <div className="space-scoped-list">
          {billsOnlyRows.length ? billsOnlyRows.map((item) => <article key={item.id} className="space-scoped-row">
            <div>
              <strong>{item.name}</strong>
              <small>{item.payee || item.categoryName} · {item.nextDueDate ? `Due ${displaySpaceDate(item.nextDueDate)}` : item.status === 'completed' ? 'Completed' : 'No next due date'}</small>
            </div>
            <div className="space-scoped-amount">
              <strong>{formatMoney(item.amountMinor, item.currency)}</strong>
              <small>{item.type === 'instalment' ? `${formatMoney(item.amountPaidMinor, item.currency)} paid` : item.status}</small>
            </div>
          </article>) : (
            <EmptyState
              title="No bills or instalments in this Space"
              description="Add a bill or instalment for this Space to start tracking what is due."
            />
          )}
        </div>}

        {space.type !== 'personal' && section === 'instalments' && (
          <div className="space-scoped-list">
            {instalmentRows.length
              ? instalmentRows.map(
                  (item) => (
                    <article
                      key={item.id}
                      className="space-scoped-row"
                    >
                      <div>
                        <strong>
                          {item.name}
                        </strong>
                        <small>
                          {item.payee
                            || item.categoryName}
                          {' · '}
                          {item.nextDueDate
                            ? `Due ${displaySpaceDate(
                                item.nextDueDate,
                              )}`
                            : item.status === 'completed'
                              ? 'Completed'
                              : 'No next due date'}
                        </small>
                      </div>

                      <div className="space-scoped-amount">
                        <strong>
                          {formatMoney(
                            item.amountMinor,
                            item.currency,
                          )}
                        </strong>
                        <small>
                          {formatMoney(
                            item.amountPaidMinor,
                            item.currency,
                          )}
                          {' paid'}
                        </small>
                      </div>
                    </article>
                  ),
                )
              : (
                <EmptyState
                  title="No instalments in this Personal Space"
                  description="Add an instalment for this Personal Space to track its payments and due dates."
                />
              )}
          </div>
        )}

        {space.type === 'sme'
          && space.ownerId === user?.uid
          && section === 'bills'
          && (
            <Suspense
              fallback={
                <div className="loading-panel">
                  Loading Business Bills & Instalments…
                </div>
              }
            >
              <EmbeddedCommitmentsPage
                embedded
                spaceIdOverride={space.id}
              />
            </Suspense>
          )}

        {section === 'reports' && <>
          <div className="space-report-controls">
            <label>Period
              <select value={reportRange} onChange={(event) => setReportRange(event.target.value as SpaceReportRange)}>
                <option value="day">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="year">This year</option>
                <option value="custom">Specific / custom dates</option>
              </select>
            </label>
            {reportRange === 'custom' && <>
              <label>From<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label>
              <label>To<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label>
            </>}
          </div>
          <p className="space-report-period">{displaySpaceDate(window.from)} – {displaySpaceDate(window.to)}</p>
          <div className="space-scoped-summary">
            <div><span>Money in</span><strong>{formatMoney(reportIncome, space.currency)}</strong></div>
            <div><span>Money out</span><strong>{formatMoney(reportExpense, space.currency)}</strong></div>
            <div><span>Net</span><strong>{formatMoney(reportIncome - reportExpense, space.currency)}</strong></div>
          </div>
          <div className="space-report-breakdown">
            <div className="panel-heading"><div><span className="eyebrow">Spending</span><h3>By category</h3></div></div>
            {expenseByCategory.length ? expenseByCategory.map(([category, amount]) => <div key={category} className="space-report-category"><span>{category}</span><strong>{formatMoney(amount, space.currency)}</strong></div>) : <p className="muted">No spending in this period.</p>}
          </div>
        </>}

        {section === 'calendar' && <div className="space-scoped-list">
          {calendarRows.length ? calendarRows.map((item) => <article key={item.id} className="space-scoped-row">
            <div><strong>{item.label}</strong><small>{item.kind} · {item.detail}</small></div>
            <div className="space-scoped-amount"><strong>{displaySpaceDate(item.date)}</strong><small>{item.date < today ? 'Past' : item.date === today ? 'Today' : 'Upcoming'}</small></div>
          </article>) : <EmptyState title="Nothing scheduled in this Space" description="Add a bill, Budget period, or goal target to give this Space something to schedule." />}
        </div>}
      </div>
    </Modal>}

    {personalMoneyType && (
      <MoneyActivityModal
        accounts={accounts}
        spaces={[space]}
        categories={personalCategories}
        timezone={
          profile?.timezone
          || space.timezone
          || 'Asia/Brunei'
        }
        online={online}
        initialType={personalMoneyType}
        lockedSpaceId={space.id}
        onCategoriesChanged={
          reloadPersonalCategories
        }
        onClose={() =>
          setPersonalMoneyType(null)
        }
        onSubmit={postTransaction}
        onComplete={async (
          _message,
          refresh,
        ) => {
          setPersonalMoneyType(null);

          if (refresh) {
            await onRefresh();
          }
        }}
      />
    )}
  </>;
}

function CustomSpaceModuleSettings({
  space,
  onSaved,
}: {
  space: Space;
  onSaved: () => Promise<void>;
}) {
  const [modules, setModules] = useState<CustomSpaceModule[]>(
    normalizeCustomSpaceModules(space.customModules),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setModules(normalizeCustomSpaceModules(space.customModules));
  }, [space.customModules]);

  const toggleModule = (module: CustomSpaceModule) => {
    setModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module],
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await updateSpace(space.id, {
        name: space.name,
        description: space.description,
        customModules: modules,
      });

      await onSaved();
      setMessage('Custom Space modules updated.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  };

  return <section className="panel space-settings-panel custom-space-module-settings">
    <div className="panel-heading">
      <div>
        <span className="eyebrow">Custom Space</span>
        <h2>Choose your modules</h2>
      </div>
    </div>

    <p className="muted">
      Money activity, Members, Chat, Shared expenses and Settlements stay available.
    </p>

    {error && <div className="notice error">{error}</div>}
    {message && <div className="notice success">{message}</div>}

    <div className="custom-space-module-list">
      {CUSTOM_SPACE_MODULE_OPTIONS.map((item) => <label key={item.value} className="custom-space-module-option">
        <input
          type="checkbox"
          checked={modules.includes(item.value)}
          onChange={() => toggleModule(item.value)}
        />
        <span>
          <strong>{item.label}</strong>
          <small>{item.detail}</small>
        </span>
      </label>)}
    </div>

    <div className="button-row">
      <button
        type="button"
        className="button primary"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? 'Saving…' : 'Save modules'}
      </button>
    </div>
  </section>;
}

function PersonalSpaceSettings({ space }: { space: Space }) {
  return <section className="panel space-settings-panel">
    <div className="panel-heading"><div><span className="eyebrow">Space settings</span><h2>{space.name}</h2></div></div>
    <div className="settings-detail-list">
      <div><span>Space type</span><strong>Personal</strong></div>
      <div><span>Who can use it</span><strong>Only you</strong></div>
      <div><span>Currency</span><strong>{space.currency}</strong></div>
      <div><span>Time</span><strong>Brunei time</strong></div>
    </div>
    <div className="notice">Your Personal Space is always kept because it is the main home for your personal money.</div>
    <Link className="button secondary" to="/spaces">Edit Space name or description</Link>
  </section>;
}


function SpaceLifecyclePanel({ space, onFinished }: { space: Space; onFinished: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<LifecycleConfirmState<Space, 'archive' | 'delete'> | null>(null);

  function ask(action: 'archive' | 'delete') {
    setError('');
    setDialog(action === 'archive'
      ? {
          record: space,
          action,
          title: space.type === 'trip' ? `Close ${space.name}?` : `Archive ${space.name}?`,
          description: 'It will move to Archived Spaces and disappear from normal use.',
          note: 'Contributions, spending, balances, members, and payment history will stay available.',
          confirmLabel: space.type === 'trip' ? 'Close Trip' : 'Archive Space',
        }
      : {
          record: space,
          action,
          title: `Delete ${space.name} permanently?`,
          description: 'Permanent deletion only works when the Space is empty and has no saved history.',
          note: 'This cannot be undone.',
          confirmLabel: 'Delete permanently',
          tone: 'danger',
        });
  }

  async function run() {
    if (!dialog) return;
    setBusy(true); setError('');
    try { await manageSpace(space.id, dialog.action); setDialog(null); onFinished(); }
    catch (nextError) {
      const message = getErrorMessage(nextError);
      if (dialog.action === 'delete' && /archive/i.test(message)) {
        setDialog({ record: space, action: 'archive', title: `${space.name} cannot be deleted`, description: message, note: 'Archive it instead. Previous records will stay correct and can be viewed later.', confirmLabel: space.type === 'trip' ? 'Close Trip instead' : 'Archive Space instead' });
      } else setError(message);
    }
    finally { setBusy(false); }
  }

  return <section className="panel danger-zone-panel">
    <div className="panel-heading"><div><span className="eyebrow">Space controls</span><h2>Archive or delete this Space</h2></div></div>
    {error && !dialog && <div className="notice error">{error}</div>}
    <p>Archive keeps previous records and lets you restore the Space later. Delete only works for an empty Space.</p>
    <div className="button-row"><button className="button secondary" disabled={busy} onClick={() => ask('archive')}>{space.type === 'trip' ? 'Close Trip' : 'Archive Space'}</button><button className="button danger" disabled={busy} onClick={() => ask('delete')}>Delete Space</button></div>
    {dialog && <LifecycleConfirmModal state={dialog} busy={busy} error={error} onClose={() => { setDialog(null); setError(''); }} onConfirm={() => void run()} />}
  </section>;
}
