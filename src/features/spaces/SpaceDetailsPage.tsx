import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAccounts } from '../../repositories/accountRepository';
import { listBudgets } from '../../repositories/budgetRepository';
import { listCommitments } from '../../repositories/commitmentRepository';
import {
  listSharedBillAssignments,
  listSpaceMembers,
} from '../../repositories/collaborationRepository';
import { listGoals } from '../../repositories/goalRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import { listTransactions } from '../../repositories/transactionRepository';
import type {
  Account,
  Budget,
  Commitment,
  FinancialTransaction,
  SavingsGoal,
  SharedBillAssignment,
  Space,
  SpaceMember,
  SpaceType,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';
import { CollaborationPage, type CollaborationTab } from '../collaboration/CollaborationPage';

type SpaceDetailsTab = 'overview' | CollaborationTab;

const spaceTypeLabel: Record<SpaceType, string> = {
  personal: 'Personal',
  household: 'Household',
  sme: 'SME',
  trip: 'Trip',
  goal: 'Goal',
  custom: 'Custom',
};

function tabFromSearch(value: string | null, shared: boolean): SpaceDetailsTab {
  if (value === 'settings') return 'settings';
  if (shared && (value === 'members' || value === 'bills' || value === 'activity')) return value;
  return 'overview';
}

function spaceDescription(space: Space) {
  if (space.description) return space.description;
  if (space.type === 'personal') return 'Your private place for personal money.';
  if (space.type === 'household') return 'Manage household money, members, and shared bills together.';
  if (space.type === 'trip') return 'Keep trip spending, members, and shared payments in one place.';
  if (space.type === 'sme') return 'Keep business money separate from personal money.';
  if (space.type === 'goal') return 'Track money for a shared goal or project.';
  return 'A separate place for this money activity.';
}

export function SpaceDetailsPage() {
  const { user } = useAuth();
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

      const [nextAccounts, nextTransactions, nextBudgets, nextGoals, nextCommitments] = await Promise.all([
        listAccounts(user.uid),
        listTransactions(user.uid),
        listBudgets(user.uid),
        listGoals(user.uid),
        listCommitments(user.uid),
      ]);

      setAccounts(nextAccounts);
      setTransactions(nextTransactions.filter((item) => item.spaceId === spaceId));
      setBudgets(nextBudgets.filter((item) => item.spaceId === spaceId));
      setGoals(nextGoals.filter((item) => item.spaceId === spaceId));
      setCommitments(nextCommitments.filter((item) => item.spaceId === spaceId));

      if (nextSpace.type !== 'personal') {
        const [nextMembers, nextSharedBills] = await Promise.all([
          listSpaceMembers(spaceId),
          listSharedBillAssignments(spaceId),
        ]);
        setMembers(nextMembers);
        setSharedBills(nextSharedBills);
      } else {
        setMembers([]);
        setSharedBills([]);
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
  const activeMembers = members.filter((item) => (item.status || 'active') === 'active');
  const currentMember = members.find((item) => item.uid === user?.uid);

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

  const tabs: Array<{ id: SpaceDetailsTab; label: string }> = shared
    ? [
      { id: 'overview', label: 'Overview' },
      { id: 'members', label: 'Members' },
      { id: 'bills', label: space.type === 'trip' ? 'Shared expenses' : 'Shared bills' },
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
      description={spaceDescription(space)}
      action={<Link className="button secondary" to="/spaces">All Spaces</Link>}
    />
    {error && <div className="notice error">{error}</div>}
    {space.archivedAt && <div className="notice">This Space is hidden. Its previous money records are still kept.</div>}

    <section className="space-details-identity">
      <span className={`space-icon large ${space.type}`}>{space.name.charAt(0).toUpperCase()}</span>
      <div>
        <strong>{spaceTypeLabel[space.type]}</strong>
        <span>{shared ? `${currentMember?.role === 'owner' ? 'Owner' : currentMember?.role || 'Member'} · Shared Space` : 'Private Space'}</span>
      </div>
      <div className="space-details-meta"><span>{space.currency}</span><span>Brunei time</span><span>{space.displayId}</span></div>
    </section>

    <nav className="space-details-tabs" aria-label="Space sections">
      {tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => chooseTab(tab.id)}>{tab.label}</button>)}
    </nav>

    {activeTab === 'overview' ? <SpaceOverview
      space={space}
      moneyIn={moneyIn}
      moneyOut={moneyOut}
      accountsUsed={accountsUsed}
      budgets={budgets}
      goals={goals}
      openBills={openBills}
      memberCount={activeMembers.length}
      openSharedBillCount={openSharedBills.length}
    /> : shared ? <CollaborationPage
      embedded
      spaceIdOverride={space.id}
      activeTab={activeTab as CollaborationTab}
      onSpaceUpdated={load}
    /> : <PersonalSpaceSettings space={space} />}
  </main>;
}

function SpaceOverview({
  space,
  moneyIn,
  moneyOut,
  accountsUsed,
  budgets,
  goals,
  openBills,
  memberCount,
  openSharedBillCount,
}: {
  space: Space;
  moneyIn: number;
  moneyOut: number;
  accountsUsed: Account[];
  budgets: Budget[];
  goals: SavingsGoal[];
  openBills: Commitment[];
  memberCount: number;
  openSharedBillCount: number;
}) {
  const shared = space.type !== 'personal';
  const quickLinks = [
    { to: `/transactions?spaceId=${space.id}`, icon: '↔', title: 'Money activity', detail: 'See money in, money out, and account transfers.' },
    { to: `/budgets?spaceId=${space.id}`, icon: '▤', title: space.type === 'trip' ? 'Trip budget' : 'Budgets', detail: 'Plan how much can be spent.' },
    { to: `/bills?spaceId=${space.id}`, icon: '◷', title: 'Bills & instalments', detail: 'See payments and dates for this Space.' },
    { to: `/reports?spaceId=${space.id}`, icon: '⌁', title: 'Money reports', detail: 'Understand where the money went.' },
    { to: `/calendar?spaceId=${space.id}`, icon: '▦', title: 'Calendar', detail: 'See what is late or coming soon.' },
  ];
  if (space.type === 'personal' || space.type === 'goal' || space.type === 'custom') {
    quickLinks.splice(2, 0, { to: `/goals?spaceId=${space.id}`, icon: '◇', title: 'Goals', detail: 'Track money you are saving.' });
  }

  return <>
    <section className="summary-grid space-overview-summary">
      <article className="summary-card featured"><span>Money in</span><strong>{formatMoney(moneyIn, space.currency)}</strong><small>Saved in this Space</small></article>
      <article className="summary-card"><span>Money out</span><strong>{formatMoney(moneyOut, space.currency)}</strong><small>Saved spending in this Space</small></article>
      <article className="summary-card"><span>{shared ? 'Members' : 'Accounts used'}</span><strong>{shared ? memberCount : accountsUsed.length}</strong><small>{shared ? 'Active people in this Space' : 'Accounts connected through money activity'}</small></article>
      <article className="summary-card"><span>{shared ? 'Shared items still open' : 'Bills still open'}</span><strong>{shared ? openSharedBillCount : openBills.length}</strong><small>Items that still need attention</small></article>
    </section>

    {shared && <div className="info-banner"><strong>Sharing stays inside this Space</strong><span>Open Members, Shared bills or Activity above. There is no separate Sharing page.</span></div>}

    <section className="panel space-overview-panel">
      <div className="panel-heading"><div><span className="eyebrow">Open a section</span><h2>Manage this Space</h2></div></div>
      <div className="space-quick-grid">
        {quickLinks.map((item) => <Link key={item.to} className="space-quick-card" to={item.to}>
          <span className="space-quick-icon">{item.icon}</span>
          <div><strong>{item.title}</strong><small>{item.detail}</small></div>
          <span aria-hidden="true">→</span>
        </Link>)}
      </div>
    </section>

    <section className="space-overview-grid">
      <article className="panel compact-panel"><span className="eyebrow">Planning</span><h2>{budgets.length} budget{budgets.length === 1 ? '' : 's'}</h2><p>{goals.length} savings goal{goals.length === 1 ? '' : 's'} connected to this Space.</p></article>
      <article className="panel compact-panel"><span className="eyebrow">Payments</span><h2>{openBills.length} bill{openBills.length === 1 ? '' : 's'} still open</h2><p>Open Bills & instalments to record or review payments.</p></article>
      <article className="panel compact-panel"><span className="eyebrow">Accounts used here</span><h2>{accountsUsed.length}</h2>{accountsUsed.length ? <p>{accountsUsed.slice(0, 3).map((item) => item.name).join(', ')}</p> : <p>Record money activity to connect an account to this Space.</p>}</article>
    </section>
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
