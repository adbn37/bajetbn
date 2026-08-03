import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { categoryIconGlyph } from '../categories/defaultCategories';
import { listAccounts } from '../../repositories/accountRepository';
import { listBudgets } from '../../repositories/budgetRepository';
import { listCommitments } from '../../repositories/commitmentRepository';
import { listGoals } from '../../repositories/goalRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import { listTransactions } from '../../repositories/transactionRepository';
import type { Account, Budget, Commitment, FinancialTransaction, SavingsGoal, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';
import { localeForLanguage } from '../../services/i18n';
import { buildFinancialHealth, sumAccountBalances } from './financialHealth';

interface AmountBarItem {
  id: string;
  label: string;
  amountMinor: number;
  detail?: string;
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function moveMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthName(month: string, locale: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
}

function categoryKey(transaction: FinancialTransaction) {
  return transaction.categoryId || `name:${(transaction.category || 'Other').toLowerCase()}`;
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function comparisonText(current: number, previous: number, currency: string) {
  if (current === 0 && previous === 0) return 'No activity in this or the previous month';
  const difference = current - previous;
  if (difference === 0) return 'Same as the previous month';
  return `${formatMoney(Math.abs(difference), currency)} ${difference > 0 ? 'more' : 'less'} than the previous month`;
}

function AmountBars({ items, currency, emptyText }: { items: AmountBarItem[]; currency: string; emptyText: string }) {
  const maximum = Math.max(0, ...items.map((item) => item.amountMinor));
  if (!items.length) return <div className="report-empty">{emptyText}</div>;

  return <div className="report-bars">{items.map((item) => <div className="report-bar-row" key={item.id}>
    <div className="report-bar-heading"><div><strong>{item.label}</strong>{item.detail && <small>{item.detail}</small>}</div><b>{formatMoney(item.amountMinor, currency)}</b></div>
    <div className="report-bar-track" aria-label={`${item.label}: ${formatMoney(item.amountMinor, currency)}`}><span style={{ width: `${maximum ? Math.max(4, percent(item.amountMinor, maximum)) : 0}%` }} /></div>
  </div>)}</div>;
}

export function ReportsPage() {
  const { user, profile } = useAuth();
  const { language } = usePreferences();
  const locale = localeForLanguage(language);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    Promise.all([
      listAccounts(user.uid),
      listSpaces(user.uid),
      listTransactions(user.uid),
      listBudgets(user.uid),
      listGoals(user.uid),
      listCommitments(user.uid),
    ]).then(([nextAccounts, nextSpaces, nextTransactions, nextBudgets, nextGoals, nextCommitments]) => {
      setAccounts(nextAccounts);
      setSpaces(nextSpaces.filter((item) => !item.archivedAt));
      setTransactions(nextTransactions);
      setBudgets(nextBudgets);
      setGoals(nextGoals);
      setCommitments(nextCommitments);
    }).catch((nextError) => setError(getErrorMessage(nextError))).finally(() => setLoading(false));
  }, [user]);

  const currency = profile?.currency || 'BND';
  const accountNames = useMemo(() => new Map(accounts.map((item) => [item.id, item.name])), [accounts]);
  const spaceNames = useMemo(() => new Map(spaces.map((item) => [item.id, item.name])), [spaces]);
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    for (let index = 0; index < 12; index += 1) months.add(moveMonth(currentMonth(), -index));
    transactions.forEach((item) => months.add(item.transactionDate.slice(0, 7)));
    return [...months].filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [transactions]);
  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>();
    transactions.forEach((item) => options.set(categoryKey(item), item.category || 'Other'));
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [transactions]);

  const matchesNonMonthFilters = (item: FinancialTransaction) => (
    (!selectedSpace || item.spaceId === selectedSpace)
    && (!selectedAccount || item.accountId === selectedAccount || item.destinationAccountId === selectedAccount)
    && (!selectedCategory || categoryKey(item) === selectedCategory)
  );

  const filteredTransactions = useMemo(() => transactions.filter((item) => (
    item.status === 'posted'
    && (item.type === 'income' || item.type === 'expense')
    && (!selectedMonth || item.transactionDate.startsWith(selectedMonth))
    && matchesNonMonthFilters(item)
  )), [transactions, selectedMonth, selectedSpace, selectedAccount, selectedCategory]);

  const previousMonth = selectedMonth ? moveMonth(selectedMonth, -1) : '';
  const previousTransactions = useMemo(() => transactions.filter((item) => (
    item.status === 'posted'
    && (item.type === 'income' || item.type === 'expense')
    && Boolean(previousMonth)
    && item.transactionDate.startsWith(previousMonth)
    && matchesNonMonthFilters(item)
  )), [transactions, previousMonth, selectedSpace, selectedAccount, selectedCategory]);

  const moneyIn = filteredTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountMinor, 0);
  const moneyOut = filteredTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const moneyLeft = moneyIn - moneyOut;
  const previousMoneyIn = previousTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountMinor, 0);
  const previousMoneyOut = previousTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);

  const spendingByCategory = useMemo(() => {
    const grouped = new Map<string, AmountBarItem>();
    filteredTransactions.filter((item) => item.type === 'expense').forEach((item) => {
      const key = categoryKey(item);
      const current = grouped.get(key) || { id: key, label: `${categoryIconGlyph(item.categoryIcon || '')} ${item.category || 'Other'}`, amountMinor: 0, detail: 'Spending category' };
      current.amountMinor += item.amountMinor;
      grouped.set(key, current);
    });
    return [...grouped.values()].sort((a, b) => b.amountMinor - a.amountMinor).slice(0, 8);
  }, [filteredTransactions]);

  const spendingByAccount = useMemo(() => {
    const grouped = new Map<string, AmountBarItem>();
    filteredTransactions.filter((item) => item.type === 'expense').forEach((item) => {
      const key = item.accountId || 'unknown';
      const current = grouped.get(key) || { id: key, label: accountNames.get(key) || 'Unknown account', amountMinor: 0, detail: 'Paid from this account' };
      current.amountMinor += item.amountMinor;
      grouped.set(key, current);
    });
    return [...grouped.values()].sort((a, b) => b.amountMinor - a.amountMinor).slice(0, 8);
  }, [filteredTransactions, accountNames]);

  const spendingBySpace = useMemo(() => {
    const grouped = new Map<string, AmountBarItem>();
    filteredTransactions.filter((item) => item.type === 'expense').forEach((item) => {
      const key = item.spaceId || 'unknown';
      const current = grouped.get(key) || { id: key, label: spaceNames.get(key) || 'Unknown Space', amountMinor: 0, detail: 'Money group' };
      current.amountMinor += item.amountMinor;
      grouped.set(key, current);
    });
    return [...grouped.values()].sort((a, b) => b.amountMinor - a.amountMinor).slice(0, 8);
  }, [filteredTransactions, spaceNames]);

  const shownBudgets = useMemo(() => budgets.filter((item) => {
    if (selectedSpace && item.spaceId !== selectedSpace) return false;
    if (selectedCategory && item.categoryId && item.categoryId !== selectedCategory) return false;
    if (!selectedMonth) return true;
    const monthStart = `${selectedMonth}-01`;
    const monthEnd = `${selectedMonth}-31`;
    return item.startDate <= monthEnd && item.endDate >= monthStart;
  }).map((item) => {
    const spentMinor = transactions.filter((transaction) => (
      transaction.status === 'posted'
      && transaction.type === 'expense'
      && transaction.spaceId === item.spaceId
      && (!item.categoryId || transaction.categoryId === item.categoryId)
      && transaction.transactionDate >= item.startDate
      && transaction.transactionDate <= item.endDate
      && (!selectedMonth || transaction.transactionDate.startsWith(selectedMonth))
      && (!selectedAccount || transaction.accountId === selectedAccount)
      && (!selectedCategory || categoryKey(transaction) === selectedCategory)
    )).reduce((sum, transaction) => sum + transaction.amountMinor, 0);
    return { ...item, reportSpentMinor: spentMinor };
  }), [budgets, transactions, selectedMonth, selectedSpace, selectedAccount, selectedCategory]);

  const paidCommitmentIds = useMemo(() => new Set(filteredTransactions.filter((item) => item.type === 'expense' && item.commitmentId).map((item) => item.commitmentId as string)), [filteredTransactions]);
  const shownCommitments = useMemo(() => commitments.filter((item) => {
    if (selectedSpace && item.spaceId !== selectedSpace) return false;
    if (selectedAccount && item.accountId !== selectedAccount) return false;
    if (selectedCategory && item.categoryId !== selectedCategory) return false;
    if (!selectedMonth) return true;
    return Boolean(item.nextDueDate?.startsWith(selectedMonth) || paidCommitmentIds.has(item.id));
  }), [commitments, selectedMonth, selectedSpace, selectedAccount, selectedCategory, paidCommitmentIds]);

  const today = new Date().toISOString().slice(0, 10);
  const dueCommitments = shownCommitments.filter((item) => item.status === 'active' && Boolean(item.nextDueDate));
  const stillToPay = dueCommitments.reduce((sum, item) => sum + item.amountMinor, 0);
  const paidBills = shownCommitments.filter((item) => paidCommitmentIds.has(item.id)).length;
  const lateBills = commitments.filter((item) => item.status === 'active' && Boolean(item.nextDueDate && item.nextDueDate < today) && (!selectedSpace || item.spaceId === selectedSpace)).length;
  const instalmentsLeft = shownCommitments.filter((item) => item.type === 'instalment').reduce((sum, item) => sum + Math.max(0, (item.totalAmountMinor || 0) - item.amountPaidMinor), 0);

  const shownGoals = goals.filter((item) => !selectedSpace || item.spaceId === selectedSpace);
  const goalTarget = shownGoals.reduce((sum, item) => sum + item.targetMinor, 0);
  const goalSaved = shownGoals.reduce((sum, item) => sum + item.currentMinor, 0);
  const budgetLimit = shownBudgets.reduce((sum, item) => sum + item.limitMinor, 0);
  const budgetSpent = shownBudgets.reduce((sum, item) => sum + item.reportSpentMinor, 0);
  const budgetsOver = shownBudgets.filter((item) => item.reportSpentMinor > item.limitMinor).length;

  const healthCommitments = useMemo(() => commitments.filter((item) => (
    item.status === 'active'
    && !item.archivedAt
    && !item.stoppedAt
    && (!selectedSpace || item.spaceId === selectedSpace)
    && (!selectedAccount || item.accountId === selectedAccount)
    && (!selectedCategory || item.categoryId === selectedCategory)
  )), [commitments, selectedSpace, selectedAccount, selectedCategory]);

  const financialHealth = useMemo(() => buildFinancialHealth({
    moneyIn,
    moneyOut,
    budgets: shownBudgets,
    commitments: healthCommitments,
    goals: shownGoals,
    currentTransactions: filteredTransactions,
    previousTransactions,
    formatAmount: (amountMinor) => formatMoney(amountMinor, currency),
  }), [moneyIn, moneyOut, shownBudgets, healthCommitments, shownGoals, filteredTransactions, previousTransactions, currency]);

  const selectedSpaceRecord = spaces.find((item) => item.id === selectedSpace) || null;
  const selectedSpaceAccountIds = useMemo(() => new Set(transactions.filter((item) => (
    item.spaceId === selectedSpace && item.status === 'posted'
  )).flatMap((item) => [item.accountId, item.destinationAccountId || '']).filter(Boolean)), [transactions, selectedSpace]);
  const selectedSmeAccounts = accounts.filter((item) => selectedSpaceAccountIds.has(item.id) && !item.closedAt);
  const selectedSmeCashPosition = sumAccountBalances(selectedSmeAccounts);
  const thirtyDaysFromToday = new Date();
  thirtyDaysFromToday.setDate(thirtyDaysFromToday.getDate() + 30);
  const thirtyDayDate = thirtyDaysFromToday.toISOString().slice(0, 10);
  const selectedSmeUpcoming = commitments.filter((item) => (
    selectedSpaceRecord?.type === 'sme'
    && item.spaceId === selectedSpaceRecord.id
    && item.status === 'active'
    && !item.archivedAt
    && !item.stoppedAt
    && Boolean(item.nextDueDate && item.nextDueDate >= today && item.nextDueDate <= thirtyDayDate)
  ));
  const selectedSmeUpcomingMinor = selectedSmeUpcoming.reduce((sum, item) => sum + item.amountMinor, 0);

  const helpfulNotes = useMemo(() => {
    const notes: string[] = [];
    if (!filteredTransactions.length) notes.push('There is no money activity for these filters yet. Add income or an expense to see a report.');
    else if (moneyLeft < 0) notes.push(`You spent ${formatMoney(Math.abs(moneyLeft), currency)} more than you received.`);
    else notes.push(`You kept ${formatMoney(moneyLeft, currency)} after spending.`);
    if (budgetsOver > 0) notes.push(`${budgetsOver} budget${budgetsOver === 1 ? ' is' : 's are'} over the planned amount.`);
    else if (shownBudgets.length > 0) notes.push('Your shown budgets are within the planned amounts.');
    if (lateBills > 0) notes.push(`${lateBills} bill${lateBills === 1 ? ' is' : 's are'} late. Check Bills & instalments.`);
    if (shownGoals.length > 0) notes.push(`You have saved ${percent(goalSaved, goalTarget)}% of your shown goals.`);
    return notes.slice(0, 4);
  }, [filteredTransactions.length, moneyLeft, currency, budgetsOver, shownBudgets.length, lateBills, shownGoals.length, goalSaved, goalTarget]);

  const resetFilters = () => {
    setSelectedMonth(currentMonth());
    setSelectedSpace('');
    setSelectedAccount('');
    setSelectedCategory('');
  };

  return <main className="page reports-page">
    <PageHeader eyebrow="Reports" title="Money reports" description="See where your money came from, where it went, and what may need your attention." />
    {error && <div className="notice error">{error}</div>}

    <section className="report-filter-panel" aria-label="Report filters">
      <label>Month<select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}><option value="">All time</option>{monthOptions.map((month) => <option value={month} key={month}>{monthName(month, locale)}</option>)}</select></label>
      <label>Space<select value={selectedSpace} onChange={(event) => setSelectedSpace(event.target.value)}><option value="">All Spaces</option>{spaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Account<select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}><option value="">All accounts</option>{accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Category<select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}><option value="">All categories</option>{categoryOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <button className="button secondary" type="button" onClick={resetFilters}>Reset</button>
      <small>Account and category filters only change sections linked to money activity.</small>
    </section>

    <section className="summary-grid report-summary-grid">
      <article className="summary-card featured"><span>Money in</span><strong>{loading ? '—' : formatMoney(moneyIn, currency)}</strong><small>{selectedMonth ? comparisonText(moneyIn, previousMoneyIn, currency) : 'All saved income'}</small></article>
      <article className="summary-card"><span>Money out</span><strong>{loading ? '—' : formatMoney(moneyOut, currency)}</strong><small>{selectedMonth ? comparisonText(moneyOut, previousMoneyOut, currency) : 'All saved spending'}</small></article>
      <article className={`summary-card ${moneyLeft < 0 ? 'report-warning-card' : ''}`}><span>Money left</span><strong>{loading ? '—' : formatMoney(moneyLeft, currency)}</strong><small>Money in minus money out</small></article>
      <article className="summary-card"><span>Activity shown</span><strong>{loading ? '—' : filteredTransactions.length}</strong><small>{selectedMonth ? monthName(selectedMonth, locale) : 'All time'}</small></article>
    </section>

    <section className="panel financial-health-panel" aria-labelledby="financial-health-title">
      <div className="panel-heading"><div><span className="eyebrow">Money health</span><h2 id="financial-health-title">Financial health check</h2><p>Simple indicators based on the month and filters shown above.</p></div></div>
      <div className="financial-health-grid">
        {financialHealth.indicators.map((indicator) => <article className={`health-card tone-${indicator.tone}`} key={indicator.id}>
          <div className="health-card-heading"><span>{indicator.label}</span><strong>{indicator.value}</strong></div>
          {indicator.progress !== null && indicator.progress !== undefined && <div className="health-progress" aria-label={`${indicator.label}: ${indicator.progress}%`}><span style={{ width: `${indicator.progress}%` }} /></div>}
          <small>{indicator.detail}</small>
        </article>)}
      </div>
    </section>

    <section className="reports-grid health-detail-grid">
      <article className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">Month-to-month</span><h2>Spending changes</h2></div></div>
        <div className="spending-trend-list">{financialHealth.categoryTrends.length ? financialHealth.categoryTrends.map((item) => <div className={`spending-trend-row direction-${item.direction}`} key={item.id}>
          <div><strong>{item.label}</strong><small>{formatMoney(item.previousMinor, currency)} → {formatMoney(item.currentMinor, currency)}</small></div>
          <b>{item.direction === 'same' ? 'No change' : `${item.direction === 'up' ? '+' : '−'}${formatMoney(Math.abs(item.differenceMinor), currency)}`}</b>
        </div>) : <div className="report-empty">Add spending in two months to see changes.</div>}</div>
      </article>
      <article className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">Next steps</span><h2>What to check next</h2></div></div>
        <div className="health-action-list">{financialHealth.nextSteps.map((step, index) => <div key={step}><span>{index + 1}</span><p>{step}</p></div>)}</div>
      </article>
    </section>

    {selectedSpaceRecord?.type === 'sme' && <section className="panel sme-health-panel">
      <div className="panel-heading"><div><span className="eyebrow">SME overview</span><h2>{selectedSpaceRecord.name}</h2><p>A simple business view for the selected month.</p></div></div>
      <div className="summary-grid sme-health-grid">
        <article className="summary-card featured"><span>Business money in</span><strong>{formatMoney(moneyIn, currency)}</strong><small>Income recorded in this SME Space</small></article>
        <article className="summary-card"><span>Business money out</span><strong>{formatMoney(moneyOut, currency)}</strong><small>Expenses recorded in this SME Space</small></article>
        <article className={`summary-card ${moneyLeft < 0 ? 'report-warning-card' : ''}`}><span>Simple profit check</span><strong>{formatMoney(moneyLeft, currency)}</strong><small>Money in minus money out</small></article>
        <article className="summary-card"><span>Current cash position</span><strong>{formatMoney(selectedSmeCashPosition, currency)}</strong><small>{selectedSmeAccounts.length} account{selectedSmeAccounts.length === 1 ? '' : 's'} used by this SME</small></article>
      </div>
      <div className="sme-upcoming-strip"><div><span>Upcoming payments — next 30 days</span><strong>{formatMoney(selectedSmeUpcomingMinor, currency)}</strong></div><small>{selectedSmeUpcoming.length} bill{selectedSmeUpcoming.length === 1 ? '' : 's'} or instalment{selectedSmeUpcoming.length === 1 ? '' : 's'} coming up.</small></div>
      <div className="report-data-note">The cash position uses the current balances of accounts that have been used by this SME Space. Those accounts may also be used elsewhere.</div>
    </section>}

    <section className="reports-grid">
      <article className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">Spending</span><h2>Where your money went</h2></div></div><AmountBars items={spendingByCategory} currency={currency} emptyText="No spending found for these filters." /></article>
      <article className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">Accounts</span><h2>Money used from each account</h2></div></div><AmountBars items={spendingByAccount} currency={currency} emptyText="No account spending found for these filters." /></article>
      <article className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">Spaces</span><h2>Spending by money group</h2></div></div><AmountBars items={spendingBySpace} currency={currency} emptyText="No Space spending found for these filters." /></article>
      <article className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">Helpful notes</span><h2>Simple money check</h2></div></div><div className="report-notes">{helpfulNotes.map((note) => <div key={note}><span>✓</span><p>{note}</p></div>)}</div></article>
    </section>

    <section className="reports-grid planning-report-grid">
      <article className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">Budgets</span><h2>{formatMoney(budgetSpent, currency)} of {formatMoney(budgetLimit, currency)}</h2></div></div><div className="progress planning-progress"><span style={{ width: `${percent(budgetSpent, budgetLimit)}%` }} /></div><p className="report-helper">Based on the money activity shown by your filters.</p><div className="report-mini-list">{shownBudgets.slice(0, 5).map((item) => <div key={item.id}><span>{item.name}</span><strong>{formatMoney(item.reportSpentMinor, item.currency)} / {formatMoney(item.limitMinor, item.currency)}</strong></div>)}{!shownBudgets.length && <div className="report-empty">No budgets found for these filters.</div>}</div></article>
      <article className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">Bills & instalments</span><h2>{formatMoney(stillToPay, currency)} still to pay</h2></div></div><div className="report-stat-list"><div><span>Paid in this report</span><strong>{paidBills}</strong></div><div><span>Still due</span><strong>{dueCommitments.length}</strong></div><div><span>Late now</span><strong>{lateBills}</strong></div><div><span>Instalments left</span><strong>{formatMoney(instalmentsLeft, currency)}</strong></div></div></article>
      <article className="panel report-panel"><div className="panel-heading"><div><span className="eyebrow">Savings goals</span><h2>{formatMoney(goalSaved, currency)} saved</h2></div></div><div className="progress planning-progress"><span style={{ width: `${percent(goalSaved, goalTarget)}%` }} /></div><p className="report-helper">{formatMoney(Math.max(0, goalTarget - goalSaved), currency)} still needed.</p><div className="report-mini-list">{shownGoals.slice(0, 5).map((item) => <div key={item.id}><span>{item.name}</span><strong>{percent(item.currentMinor, item.targetMinor)}%</strong></div>)}{!shownGoals.length && <div className="report-empty">No savings goals found for this Space.</div>}</div></article>
    </section>

    <div className="report-data-note">Reports use your saved BajetBN records. Payments made using another method can settle a bill, but they do not appear as account spending.</div>
  </main>;
}
