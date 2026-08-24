import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineSync } from '../contexts/OfflineSyncContext';
import { listAccounts } from '../repositories/accountRepository';
import { listAllCustomCategories } from '../repositories/categoryRepository';
import { listBudgets } from '../repositories/budgetRepository';
import { listCommitments } from '../repositories/commitmentRepository';
import { listGoals } from '../repositories/goalRepository';
import { listSpaces } from '../repositories/spaceRepository';
import { postTransaction, listTransactions } from '../repositories/transactionRepository';
import type {
  Account,
  Budget,
  Commitment,
  FinancialTransaction,
  SavingsGoal,
  Space,
  TransactionCategory,
} from '../types/models';
import { formatMoney } from '../utils/money';
import { DEFAULT_TRANSACTION_CATEGORIES } from '../features/categories/defaultCategories';
import { MoneyActivityModal } from '../features/transactions/TransactionsPage';

function monthPrefix() {
  return new Date().toISOString().slice(0, 7);
}

function transactionLabel(transaction: FinancialTransaction) {
  if (transaction.type === 'income') return 'Money in';
  if (transaction.type === 'expense') return 'Money out';
  if (transaction.type === 'transfer') return 'Transfer';
  return 'Money activity';
}

export function DashboardPage() {
  const { user, profile } = useAuth();
  const { online, lastCompletedAt } = useOfflineSync();
  const [searchParams, setSearchParams] = useSearchParams();

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
      const [
        nextAccounts,
        nextSpaces,
        nextTransactions,
        nextBudgets,
        nextGoals,
        nextCommitments,
        nextCustomCategories,
      ] = await Promise.all([
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

  useEffect(() => {
    void load();
  }, [load, lastCompletedAt]);

  const activeSpaces = useMemo(
    () => spaces.filter((item) => !item.archivedAt),
    [spaces],
  );

  const allCategories = useMemo(
    () => [
      ...DEFAULT_TRANSACTION_CATEGORIES,
      ...customCategories.filter((item) => !item.archivedAt),
    ],
    [customCategories],
  );

  const currency = profile?.currency || 'BND';

  const total = accounts
    .filter((item) => item.type !== 'credit_card')
    .reduce((sum, item) => sum + item.ledgerBalanceMinor, 0);

  const primaryAccount =
    accounts.find((item) => item.type !== 'credit_card') || accounts[0];

  const month = monthPrefix();

  const monthPosted = transactions.filter(
    (item) =>
      item.status === 'posted'
      && item.transactionDate.startsWith(month),
  );

  const income = monthPosted
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amountMinor, 0);

  const expenses = monthPosted
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amountMinor, 0);

  const today = new Date().toISOString().slice(0, 10);

  const overdue = commitments.filter(
    (item) =>
      item.status === 'active'
      && Boolean(item.nextDueDate && item.nextDueDate < today),
  ).length;

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .filter((item) => item.status === 'posted')
        .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
        .slice(0, 5),
    [transactions],
  );

  useEffect(() => {
    if (
      searchParams.get('quick') === '1'
      && !loading
      && accounts.length > 0
      && activeSpaces.length > 0
    ) {
      setShowMoneyActivity(true);
    }
  }, [
    searchParams,
    loading,
    accounts.length,
    activeSpaces.length,
  ]);

  function closeQuickActivity() {
    setShowMoneyActivity(false);

    if (searchParams.has('quick')) {
      const next = new URLSearchParams(searchParams);
      next.delete('quick');
      setSearchParams(next, { replace: true });
    }
  }

  const firstName =
    profile?.fullName?.trim().split(/\s+/)[0]
    || 'there';

  return (
    <main className="page home-v110">
      <header className="home-v110-header">
        <div>
          <span className="home-v110-kicker">Welcome back</span>
          <h1>Hi, {firstName}</h1>
        </div>

        <Link
          className="home-v110-alert"
          to="/notifications"
          aria-label="Open notifications"
        >
          ♢
        </Link>
      </header>

      {feedback && (
        <div className="notice success">
          {feedback}
        </div>
      )}

      {dataUnavailable && (
        <div className="notice">
          We cannot load your latest information. Check your internet
          connection and try again.
        </div>
      )}

      <section className="home-v110-balance-card">
        <div className="home-v110-balance-top">
          <div>
            <span>
              {primaryAccount?.name || 'Your money'}
            </span>

            <small>
              {primaryAccount
                ? primaryAccount.institution
                  || primaryAccount.type.replace('_', ' ')
                : 'Add an account to get started'}
            </small>
          </div>

          <Link to="/accounts">
            Accounts
          </Link>
        </div>

        <div className="home-v110-balance-value">
          <small>Total available</small>
          <strong>
            {loading
              ? '—'
              : formatMoney(total, currency)}
          </strong>
        </div>

        <div className="home-v110-balance-stats">
          <div>
            <span>Money in</span>
            <strong>
              {loading
                ? '—'
                : formatMoney(income, currency)}
            </strong>
            <small>This month</small>
          </div>

          <div>
            <span>Money out</span>
            <strong>
              {loading
                ? '—'
                : formatMoney(expenses, currency)}
            </strong>
            <small>This month</small>
          </div>
        </div>
      </section>

      <section className="home-v110-accounts">
        <div className="home-v110-section-heading home-v110-accounts-heading">
          <div>
            <span>Accounts</span>
            <h2>Your money</h2>
          </div>

          <Link to="/accounts">
            View all
          </Link>
        </div>

        <div className="overview-account-grid home-v110-account-grid">
          {accounts.slice(0, 4).map((account) => (
            <Link
              key={account.id}
              className={`overview-account-tile ${account.type}`}
              to={`/transactions?accountId=${encodeURIComponent(account.id)}`}
              aria-label={`View ${account.name} money activity`}
            >
              <span className={`account-symbol ${account.type}`}>
                {account.name.charAt(0)}
              </span>

              <div className="overview-account-copy">
                <strong title={account.name}>
                  {account.name}
                </strong>
                <small>
                  {account.institution || account.type.replace('_', ' ')}
                </small>
                <b>
                  {formatMoney(
                    account.ledgerBalanceMinor,
                    account.currency,
                  )}
                </b>
              </div>
            </Link>
          ))}

          <Link
            className="overview-account-tile add-account-tile"
            to="/accounts"
          >
            <span className="add-account-symbol">+</span>

            <div className="overview-account-copy">
              <strong>Add account</strong>
              <small>Bank, cash, e-wallet or card</small>
            </div>
          </Link>
        </div>
      </section>

      <section className="home-v110-shortcuts">
        <Link to="/bills">
          <span aria-hidden="true">▤</span>
          <strong>Bills</strong>
          {overdue > 0 && <small>{overdue} overdue</small>}
        </Link>

        <Link to="/spaces">
          <span aria-hidden="true">▦</span>
          <strong>Spaces</strong>
          <small>{activeSpaces.length} active</small>
        </Link>

        <Link to="/debt">
          <span aria-hidden="true">↔</span>
          <strong>Debt</strong>
          <small>Owe & owed</small>
        </Link>

        <Link to="/reports">
          <span aria-hidden="true">⌁</span>
          <strong>Reports</strong>
          <small>Insights</small>
        </Link>
      </section>

      <section className="home-v110-section">
        <div className="home-v110-section-heading">
          <div>
            <span>Recent</span>
            <h2>Money activity</h2>
          </div>

          <Link to="/transactions">
            View all
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="home-v110-activity-list">
            {recentTransactions.map((transaction) => (
              <Link
                key={transaction.id}
                to="/transactions"
                className="home-v110-activity-row"
              >
                <span
                  className={`home-v110-activity-icon ${transaction.type}`}
                  aria-hidden="true"
                >
                  {transaction.type === 'income'
                    ? '↓'
                    : transaction.type === 'expense'
                      ? '↑'
                      : '↔'}
                </span>

                <span className="home-v110-activity-copy">
                  <strong>
                    {transactionLabel(transaction)}
                  </strong>
                  <small>
                    {transaction.transactionDate}
                  </small>
                </span>

                <b className={transaction.type}>
                  {transaction.type === 'expense'
                    ? '-'
                    : transaction.type === 'income'
                      ? '+'
                      : ''}
                  {formatMoney(transaction.amountMinor, currency)}
                </b>
              </Link>
            ))}
          </div>
        ) : (
          <div className="home-v110-empty">
            <span aria-hidden="true">◎</span>
            <strong>No money activity yet</strong>
            <p>
              Record your first income or expense and it will appear here.
            </p>

            <button
              type="button"
              className="button primary"
              disabled={
                loading
                || accounts.length === 0
                || activeSpaces.length === 0
              }
              onClick={() => setShowMoneyActivity(true)}
            >
              Add income or expense
            </button>
          </div>
        )}
      </section>

      <section className="home-v110-secondary-grid">
        <Link to="/budgets">
          <span>Budgets</span>
          <strong>
            {budgets.length}
          </strong>
        </Link>

        <Link to="/goals">
          <span>Goals</span>
          <strong>
            {goals.length}
          </strong>
        </Link>

        <Link to="/subscription">
          <span>Your plan</span>
          <strong>View</strong>
        </Link>
      </section>

      {showMoneyActivity && profile && (
        <MoneyActivityModal
          accounts={accounts}
          spaces={activeSpaces}
          categories={allCategories}
          timezone={profile.timezone}
          online={online}
          onClose={closeQuickActivity}
          onSubmit={postTransaction}
          onComplete={async (message, refresh) => {
            closeQuickActivity();
            setFeedback(message);

            if (refresh) {
              await load();
            }
          }}
        />
      )}
    </main>
  );
}
