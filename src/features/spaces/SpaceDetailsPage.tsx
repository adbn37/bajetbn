import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAccounts } from '../../repositories/accountRepository';
import { listBudgets, listBudgetsForSpace } from '../../repositories/budgetRepository';
import { listCommitments, listCommitmentsForSpace } from '../../repositories/commitmentRepository';
import {
  listSharedBillAssignments,
  listSpaceMembers,
} from '../../repositories/collaborationRepository';
import { listGoals } from '../../repositories/goalRepository';
import { listSharedExpenses } from '../../repositories/sharedExpenseRepository';
import { getMySmePosAccess } from '../../repositories/smePosRepository';
import { manageSpace } from '../../repositories/lifecycleRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import { listTransactions, listTransactionsForSpace } from '../../repositories/transactionRepository';
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
  SmePosRole,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';
import { CollaborationPage, type CollaborationTab } from '../collaboration/CollaborationPage';
import { SharedExpensesPanel } from './SharedExpensesPanel';
import { SpaceFundPanel } from './SpaceFundPanel';
import { SpaceActionHub } from './SpaceActionHub';

type SpaceDetailsTab = 'overview' | CollaborationTab | 'expenses' | 'balances' | 'trip_money' | 'group_fund';
type SpaceOverviewSection = 'money' | 'budgets' | 'goals' | 'bills' | 'reports' | 'calendar';
type SpaceReportRange = 'week' | 'month' | 'year' | 'custom';

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

  if (range === 'week') {
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
  custom: 'Custom',
};

function tabFromSearch(value: string | null, shared: boolean): SpaceDetailsTab {
  if (value === 'settings') return 'settings';
  if (shared && (value === 'members' || value === 'bills' || value === 'expenses' || value === 'balances' || value === 'trip_money' || value === 'group_fund' || value === 'activity')) return value;
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
  const activeTab = tabFromSearch(searchParams.get('tab'), shared);

  const load = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);
    setError('');
    try {
      const spaces = await listSpaces(user.uid);
      const nextSpace = spaces.find((item) => item.id === spaceId) || null;
      setSpace(nextSpace);
      if (!nextSpace) return;

      const nextPosAccess = nextSpace.type === 'sme'
        ? await getMySmePosAccess(spaceId, user.uid)
        : null;
      const nextSmePosRole: SmePosRole | null = nextSpace.type === 'sme'
        ? nextSpace.ownerId === user.uid
          ? 'owner'
          : nextPosAccess?.status === 'active'
            ? nextPosAccess.role
            : null
        : null;
      setSmePosRole(nextSmePosRole);

      const canReadSmeFinancials = nextSpace.type !== 'sme'
        || nextSpace.ownerId === user.uid
        || nextSmePosRole === 'owner'
        || nextSmePosRole === 'manager';

      const [nextAccounts, nextGoals] = await Promise.all([
        listAccounts(user.uid),
        listGoals(user.uid),
      ]);
      let nextTransactions: FinancialTransaction[] = [];
      let nextBudgets: Budget[] = [];
      let nextCommitments: Commitment[] = [];

      if (nextSpace.type === 'sme' && nextSpace.ownerId !== user.uid) {
        if (canReadSmeFinancials) {
          [nextTransactions, nextBudgets, nextCommitments] = await Promise.all([
            listTransactionsForSpace(spaceId),
            listBudgetsForSpace(spaceId),
            listCommitmentsForSpace(spaceId),
          ]);
        }
      } else {
        [nextTransactions, nextBudgets, nextCommitments] = await Promise.all([
          listTransactions(user.uid),
          listBudgets(user.uid),
          listCommitments(user.uid),
        ]);
      }

      setAccounts(nextAccounts);
      setTransactions(nextTransactions.filter((item) => item.spaceId === spaceId));
      setBudgets(nextBudgets.filter((item) => item.spaceId === spaceId));
      setGoals(nextGoals.filter((item) => item.spaceId === spaceId));
      setCommitments(nextCommitments.filter((item) => item.spaceId === spaceId));

      if (nextSpace.type !== 'personal') {
        const [nextMembers, nextSharedBills, nextSharedExpenses] = await Promise.all([
          listSpaceMembers(spaceId),
          listSharedBillAssignments(spaceId),
          listSharedExpenses(spaceId),
        ]);
        setMembers(nextMembers);
        setSharedBills(nextSharedBills);
        setSharedExpenses(nextSharedExpenses);
      } else {
        setMembers([]);
        setSharedBills([]);
        setSharedExpenses([]);
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [spaceId, user]);

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

  const supportsGroupFund = space.type === 'trip' || space.type === 'household' || space.type === 'custom';
  const fundTabId: SpaceDetailsTab = space.type === 'trip' ? 'trip_money' : 'group_fund';
  const fundTabLabel = space.type === 'trip' ? 'Trip money' : space.type === 'household' ? 'Household fund' : 'Group fund';

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
      { id: 'members', label: 'Members' },
      ...sharedFinanceTabs,
      { id: 'activity', label: 'Activity' },
      { id: 'settings', label: 'Space settings' },
    ]
    : [
      { id: 'overview', label: 'Overview' },
      { id: 'settings', label: 'Space settings' },
    ];

  return <main className="page space-details-page">
    <PageHeader
      eyebrow={`${spaceTypeLabel[space.type]} Space`}
      title={space.name}
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
        <span className={`space-icon large ${space.type}`}>{space.name.charAt(0).toUpperCase()}</span>

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

    {space.type === 'sme' && !space.archivedAt && (
      <section className="sme-pos-hero">
        <div className="sme-pos-hero-copy">
          <h2>Point of sale</h2>
          <p>Register, manage stock and review sales.</p>
        </div>

        <div className="sme-pos-hero-actions">
          <Link
            className="button primary sme-pos-open-button"
            to={`/spaces/${space.id}/pos`}
          >
            Open POS
          </Link>

          {currentMember?.role === 'owner' && (
            <Link
              className="button secondary"
              to={`/spaces/${space.id}/pos/settings`}
            >
              Settings
            </Link>
          )}
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
        onRefresh={load}
      />
    )}
    <nav className="space-details-tabs" aria-label="Space sections">
      {tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => chooseTab(tab.id)}>{tab.label}</button>)}
      {space.type === 'sme' && <Link className="space-details-tab-link" to={`/spaces/${space.id}/pos`}>Point of sale</Link>}
      {space.type === 'collection' && <Link className="space-details-tab-link" to={`/spaces/${space.id}/collection`}>Collection</Link>}
    </nav>

    {activeTab === 'overview' ? <SpaceOverview
      space={space}
      moneyIn={moneyIn}
      moneyOut={moneyOut}
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
    /> : shared && activeTab === 'expenses' ? <SharedExpensesPanel space={space} members={members} currentMember={currentMember || null} canManage={currentMember?.role === 'owner' || currentMember?.role === 'admin'} view="expenses" /> : shared && activeTab === 'balances' ? <SharedExpensesPanel space={space} members={members} currentMember={currentMember || null} canManage={currentMember?.role === 'owner' || currentMember?.role === 'admin'} view="balances" /> : shared && supportsGroupFund && (activeTab === 'trip_money' || activeTab === 'group_fund') ? <SpaceFundPanel space={space} members={members} currentMember={currentMember || null} canManage={currentMember?.role === 'owner' || currentMember?.role === 'admin'} /> : shared ? <>
      <CollaborationPage embedded spaceIdOverride={space.id} activeTab={activeTab as CollaborationTab} onSpaceUpdated={load} />
      {activeTab === 'settings' && currentMember?.role === 'owner' && <SpaceLifecyclePanel space={space} onFinished={() => navigate('/spaces')} />}
    </> : <PersonalSpaceSettings space={space} />}
  </main>;
}

function SpaceOverview({
  space,
  moneyIn,
  moneyOut,
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
}: {
  space: Space;
  moneyIn: number;
  moneyOut: number;
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
}) {
  const shared = space.type !== 'personal';
  const [section, setSection] = useState<SpaceOverviewSection | null>(null);
  const [reportRange, setReportRange] = useState<SpaceReportRange>('month');
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
    { key: 'budgets', section: 'budgets', icon: '▤', title: space.type === 'trip' ? 'Trip budget' : 'Budgets', detail: 'Review budgets connected to this Space.' },
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

  if (space.type === 'personal' || space.type === 'goal' || space.type === 'custom') {
    quickLinks.splice(Math.min(2, quickLinks.length), 0, { key: 'goals', section: 'goals', icon: '◇', title: 'Goals', detail: 'Review savings goals connected to this Space.' });
  }

  const accountName = (accountId?: string | null) => {
    if (!accountId) return 'No account';
    return accountsUsed.find((item) => item.id === accountId)?.name || 'Account';
  };

  const moneyRows = [...transactions].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  const billRows = [...commitments].sort((a, b) =>
    (a.nextDueDate || a.endDate || '9999-12-31').localeCompare(b.nextDueDate || b.endDate || '9999-12-31'),
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
    money: 'Money activity',
    budgets: space.type === 'trip' ? 'Trip budget' : 'Budgets',
    goals: 'Goals',
    bills: 'Bills & instalments',
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

    {section && canViewFinancials && <Modal title={`${space.name} — ${sectionTitle[section]}`} onClose={() => setSection(null)}>
      <div className="space-scoped-modal">
        <div className="space-scoped-context"><strong>{space.name}</strong><span>Only records from this Space are shown.</span></div>

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

        {section === 'budgets' && <div className="space-scoped-list">
          {budgetRows.length ? budgetRows.map((item) => {
            const remaining = item.limitMinor - item.spentMinor;
            return <article key={item.id} className="space-scoped-row">
              <div><strong>{item.name}</strong><small>{displaySpaceDate(item.startDate)} – {displaySpaceDate(item.endDate)}{item.categoryName ? ` · ${item.categoryName}` : ''}</small></div>
              <div className="space-scoped-amount"><strong>{formatMoney(item.spentMinor, item.currency)} / {formatMoney(item.limitMinor, item.currency)}</strong><small>{formatMoney(remaining, item.currency)} remaining</small></div>
            </article>;
          }) : <EmptyState title="No budgets in this Space" description="Create a Budget for this Space to start planning its spending." />}
        </div>}

        {section === 'goals' && <div className="space-scoped-list">
          {goalRows.length ? goalRows.map((item) => <article key={item.id} className="space-scoped-row">
            <div><strong>{item.name}</strong><small>{item.targetDate ? `Target ${displaySpaceDate(item.targetDate)}` : 'No target date'} · {item.status}</small></div>
            <div className="space-scoped-amount"><strong>{formatMoney(item.currentMinor, item.currency)} / {formatMoney(item.targetMinor, item.currency)}</strong><small>{Math.max(0, Math.min(100, item.targetMinor > 0 ? Math.round((item.currentMinor / item.targetMinor) * 100) : 0))}%</small></div>
          </article>) : <EmptyState title="No goals in this Space" description="Create a goal for this Space to start tracking progress." />}
        </div>}

        {section === 'bills' && <div className="space-scoped-list">
          {billRows.length ? billRows.map((item) => <article key={item.id} className="space-scoped-row">
            <div>
              <strong>{item.name}</strong>
              <small>{item.payee || item.categoryName} · {item.nextDueDate ? `Due ${displaySpaceDate(item.nextDueDate)}` : item.status === 'completed' ? 'Completed' : 'No next due date'}</small>
            </div>
            <div className="space-scoped-amount">
              <strong>{formatMoney(item.amountMinor, item.currency)}</strong>
              <small>{item.type === 'instalment' ? `${formatMoney(item.amountPaidMinor, item.currency)} paid` : item.status}</small>
            </div>
          </article>) : <EmptyState title="No bills or instalments in this Space" description="Add a bill or instalment for this Space to start tracking what is due." />}
        </div>}

        {section === 'reports' && <>
          <div className="space-report-controls">
            <label>Period
              <select value={reportRange} onChange={(event) => setReportRange(event.target.value as SpaceReportRange)}>
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
  </>;
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
