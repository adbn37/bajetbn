import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineSync } from '../contexts/OfflineSyncContext';
import { listAccounts } from '../repositories/accountRepository';
import { listAllCustomCategories } from '../repositories/categoryRepository';
import { listBudgets } from '../repositories/budgetRepository';
import { listCommitments } from '../repositories/commitmentRepository';
import { listGoals } from '../repositories/goalRepository';
import { listSpaces } from '../repositories/spaceRepository';
import { postTransaction, listTransactions } from '../repositories/transactionRepository';
import type { Account, Budget, Commitment, FinancialTransaction, SavingsGoal, Space, TransactionCategory } from '../types/models';
import { formatMoney } from '../utils/money';
import { DEFAULT_TRANSACTION_CATEGORIES } from '../features/categories/defaultCategories';
import { MoneyActivityModal } from '../features/transactions/TransactionsPage';

function monthPrefix() { return new Date().toISOString().slice(0, 7); }

export function DashboardPage() {
  const { user, profile } = useAuth();
  const { online, lastCompletedAt } = useOfflineSync();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [customCategories, setCustomCategories] = useState<TransactionCategory[]>([]);
  const [showMoneyActivity, setShowMoneyActivity] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [dataUnavailable, setDataUnavailable] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setDataUnavailable(false);
    try {
      const [nextAccounts, nextSpaces, nextTransactions, nextBudgets, nextGoals, nextCommitments, nextCustomCategories] = await Promise.all([
        listAccounts(user.uid),
        listSpaces(user.uid),
        listTransactions(user.uid),
        listBudgets(user.uid),
        listGoals(user.uid),
        listCommitments(user.uid),
        listAllCustomCategories(user.uid),
      ]);
      setAccounts(nextAccounts);
      setSpaces(nextSpaces);
      setTransactions(nextTransactions);
      setBudgets(nextBudgets);
      setGoals(nextGoals);
      setCommitments(nextCommitments);
      setCustomCategories(nextCustomCategories);
    } catch {
      setDataUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load, lastCompletedAt]);

  const activeSpaces = useMemo(() => spaces.filter((item) => !item.archivedAt), [spaces]);
  const allCategories = useMemo(
    () => [...DEFAULT_TRANSACTION_CATEGORIES, ...customCategories.filter((item) => !item.archivedAt)],
    [customCategories],
  );

  const currency = profile?.currency || 'BND';
  const total = accounts.filter((item) => item.type !== 'credit_card').reduce((sum, item) => sum + item.ledgerBalanceMinor, 0);
  const month = monthPrefix();
  const monthPosted = transactions.filter((item) => item.status === 'posted' && item.transactionDate.startsWith(month));
  const income = monthPosted.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountMinor, 0);
  const expenses = monthPosted.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const budgetLimit = budgets.reduce((sum, item) => sum + item.limitMinor, 0);
  const budgetSpent = budgets.reduce((sum, item) => sum + item.spentMinor, 0);
  const goalTarget = goals.reduce((sum, item) => sum + item.targetMinor, 0);
  const goalCurrent = goals.reduce((sum, item) => sum + item.currentMinor, 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = commitments.filter((item) => item.status === 'active' && Boolean(item.nextDueDate && item.nextDueDate < today)).length;

  return <main className="page dashboard-page">
    <PageHeader eyebrow="Overview" title={`Good day, ${profile?.fullName?.split(' ')[0] || 'there'}`} description="See your accounts, spending plans, savings goals, bills, and instalments in one place." action={<button type="button" className="button primary" disabled={loading || !accounts.length || !activeSpaces.length} onClick={() => setShowMoneyActivity(true)}>Add income or expense</button>} />
    {feedback && <div className="notice success">{feedback}</div>}
    {dataUnavailable && <div className="notice">We cannot load your latest information. Check your internet connection and try again.</div>}

    <section className="summary-grid dashboard-summary-grid">
      <article className="summary-card featured"><span>Money available</span><strong>{loading ? '—' : formatMoney(total, currency)}</strong><small>Based on your saved money activity</small></article>
      <article className="summary-card"><span>Money in this month</span><strong>{loading ? '—' : formatMoney(income, currency)}</strong><small>Saved income records</small></article>
      <article className="summary-card"><span>Money out this month</span><strong>{loading ? '—' : formatMoney(expenses, currency)}</strong><small>Left after spending {formatMoney(income - expenses, currency)}</small></article>
      <article className="summary-card"><span>Bills overdue</span><strong>{loading ? '—' : overdue}</strong><small>Bills and instalments</small></article>
    </section>

    <section className="panel dashboard-accounts-panel">
      <div className="panel-heading"><div><span className="eyebrow">Accounts</span><h2>Your money sources</h2></div><Link to="/accounts">View all</Link></div>
      {accounts.length ? <div className="overview-account-grid">{accounts.slice(0, 7).map((account) => <Link key={account.id} className={`overview-account-tile ${account.type}`} to={`/transactions?accountId=${encodeURIComponent(account.id)}`} aria-label={`View ${account.name} money activity`}>
        <span className={`account-symbol ${account.type}`}>{account.name.charAt(0)}</span>
        <div className="overview-account-copy"><strong title={account.name}>{account.name}</strong><small>{account.institution || account.type.replace('_', ' ')}</small><b>{formatMoney(account.ledgerBalanceMinor, account.currency)}</b></div>
      </Link>)}<Link className="overview-account-tile add-account-tile" to="/accounts"><span className="add-account-symbol">+</span><div className="overview-account-copy"><strong>Add account</strong><small>Bank, cash, e-wallet, or card</small></div></Link></div> : <div className="overview-account-grid"><Link className="overview-account-tile add-account-tile" to="/accounts"><span className="add-account-symbol">+</span><div className="overview-account-copy"><strong>Add your first account</strong><small>BIBD, Baiduri, Cash, or another account</small></div></Link></div>}
    </section>

    <section className="dashboard-grid"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Spaces</span><h2>Your money groups</h2></div><Link to="/spaces">View Spaces</Link></div><div className="space-chip-grid">{activeSpaces.slice(0, 6).map((space) => <Link to={`/spaces/${space.id}`} key={space.id} className="space-chip"><span className={`space-icon ${space.type}`}>{space.name.charAt(0)}</span><div><strong>{space.name}</strong><small>{space.type}</small></div></Link>)}</div></article>
      <article className="panel dashboard-quick-actions"><div className="panel-heading"><div><span className="eyebrow">Quick access</span><h2>Plan and review</h2></div></div><div className="dashboard-quick-grid"><Link to="/budgets"><strong>Budgets</strong><span>{formatMoney(budgetSpent, currency)} used</span></Link><Link to="/goals"><strong>Savings goals</strong><span>{formatMoney(goalCurrent, currency)} saved</span></Link><Link to="/bills"><strong>Bills</strong><span>{overdue} overdue</span></Link><Link to="/reports"><strong>Reports</strong><span>Review your money</span></Link></div></article></section>

    <section className="dashboard-grid planning-dashboard"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">Budgets</span><h2>{formatMoney(budgetSpent, currency)} of {formatMoney(budgetLimit, currency)}</h2></div><Link to="/budgets">Open budgets</Link></div><div className="progress planning-progress"><span style={{ width: `${budgetLimit ? Math.min(100, Math.round(budgetSpent / budgetLimit * 100)) : 0}%` }} /></div><p>{budgets.filter((item) => item.spentMinor > item.limitMinor).length} budget(s) over limit.</p></article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">Goals</span><h2>{formatMoney(goalCurrent, currency)} saved</h2></div><Link to="/goals">Open goals</Link></div><div className="progress planning-progress"><span style={{ width: `${goalTarget ? Math.min(100, Math.round(goalCurrent / goalTarget * 100)) : 0}%` }} /></div><p>{goals.filter((item) => item.status === 'completed').length} of {goals.length} goals completed.</p></article></section>

    {showMoneyActivity && profile && <MoneyActivityModal
      accounts={accounts}
      spaces={activeSpaces}
      categories={allCategories}
      timezone={profile.timezone}
      online={online}
      onClose={() => setShowMoneyActivity(false)}
      onSubmit={postTransaction}
      onComplete={async (message, refresh) => {
        setShowMoneyActivity(false);
        setFeedback(message);
        if (refresh) await load();
      }}
    />}
  </main>;
}
