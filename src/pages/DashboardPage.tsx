import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Link,
  useSearchParams,
} from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineSync } from '../contexts/OfflineSyncContext';
import { listAccounts } from '../repositories/accountRepository';
import {
  accountColorClass,
  getAccountColor,
  getPreferredHomeAccountId,
  setPreferredHomeAccountId,
} from '../services/accountVisualPreferences';
import { listAllCustomCategories } from '../repositories/categoryRepository';
import { listSpaces } from '../repositories/spaceRepository';
import {
  listTransactionsForOwnerAccount,
  postTransaction,
} from '../repositories/transactionRepository';
import type {
  Account,
  FinancialTransaction,
  Space,
  TransactionCategory,
} from '../types/models';
import { formatMoney } from '../utils/money';
import { DEFAULT_TRANSACTION_CATEGORIES } from '../features/categories/defaultCategories';
import { MoneyActivityModal } from '../features/transactions/TransactionsPage';

function monthPrefix() {
  return new Date()
    .toISOString()
    .slice(0, 7);
}

function transactionLabel(
  transaction: FinancialTransaction,
) {
  if (transaction.type === 'income') {
    return 'Money in';
  }

  if (transaction.type === 'expense') {
    return 'Money out';
  }

  if (transaction.type === 'transfer') {
    return 'Transfer';
  }

  return 'Money activity';
}

export function DashboardPage() {
  const { user, profile } = useAuth();
  const {
    online,
    lastCompletedAt,
  } = useOfflineSync();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [
    accounts,
    setAccounts,
  ] = useState<Account[]>([]);

  /*
   * Spaces and categories are NOT part of the normal Home payload.
   * They are loaded only when the global Add action opens.
   */
  const [
    spaces,
    setSpaces,
  ] = useState<Space[]>([]);

  const [
    customCategories,
    setCustomCategories,
  ] = useState<TransactionCategory[]>([]);

  const [
    transactions,
    setTransactions,
  ] = useState<FinancialTransaction[]>([]);

  const [
    showMoneyActivity,
    setShowMoneyActivity,
  ] = useState(false);

  const [
    quickOptionsLoaded,
    setQuickOptionsLoaded,
  ] = useState(false);

  const [
    quickLoading,
    setQuickLoading,
  ] = useState(false);

  const [
    feedback,
    setFeedback,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    activityLoading,
    setActivityLoading,
  ] = useState(false);

  const [
    dataUnavailable,
    setDataUnavailable,
  ] = useState(false);

  const [
    activityUnavailable,
    setActivityUnavailable,
  ] = useState(false);

  const [
    activeAccountIndex,
    setActiveAccountIndex,
  ] = useState(0);

  const accountCarouselRef =
    useRef<HTMLDivElement | null>(null);

  const currency =
    profile?.currency || 'BND';

  const homeAccounts =
    useMemo(
      () => accounts,
      [accounts],
    );

  const activeAccount =
    homeAccounts[
      Math.min(
        activeAccountIndex,
        Math.max(
          0,
          homeAccounts.length - 1,
        ),
      )
    ] || null;

  const activeSpaces =
    useMemo(
      () =>
        spaces.filter(
          (item) => !item.archivedAt,
        ),
      [spaces],
    );

  const allCategories =
    useMemo(
      () => [
        ...DEFAULT_TRANSACTION_CATEGORIES,
        ...customCategories.filter(
          (item) => !item.archivedAt,
        ),
      ],
      [customCategories],
    );

  const loadAccounts =
    useCallback(async () => {
      if (!user) {
        return;
      }

      setDataUnavailable(false);

      try {
        const nextAccounts =
          await listAccounts(user.uid);

        setAccounts(nextAccounts);
      } catch {
        setDataUnavailable(true);
      } finally {
        setLoading(false);
      }
    }, [user]);

  const loadAccountActivity =
    useCallback(
      async (accountId: string | null) => {
        if (!user || !accountId) {
          setTransactions([]);
          setActivityUnavailable(false);
          return;
        }

        setActivityLoading(true);
        setActivityUnavailable(false);

        try {
          const nextTransactions =
            await listTransactionsForOwnerAccount(
              user.uid,
              accountId,
            );

          setTransactions(
            nextTransactions
              .filter(
                (item) =>
                  item.status === 'posted'
                  && item.type !== 'reversal',
              )
              ,
          );
        } catch {
          setTransactions([]);
          setActivityUnavailable(true);
        } finally {
          setActivityLoading(false);
        }
      },
      [user],
    );

  const loadQuickOptions =
    useCallback(async () => {
      if (!user) {
        return false;
      }

      if (quickOptionsLoaded) {
        return activeSpaces.length > 0;
      }

      setQuickLoading(true);

      try {
        const [
          nextSpaces,
          nextCategories,
        ] = await Promise.all([
          listSpaces(user.uid),
          listAllCustomCategories(
            user.uid,
          ),
        ]);

        const nextActiveSpaces =
          nextSpaces.filter(
            (item) => !item.archivedAt,
          );

        setSpaces(nextSpaces);
        setCustomCategories(
          nextCategories,
        );
        setQuickOptionsLoaded(true);

        if (
          nextActiveSpaces.length === 0
        ) {
          setFeedback(
            'Create or restore a Space before recording money activity.',
          );

          return false;
        }

        return true;
      } catch {
        setFeedback(
          'The Add form could not load its Space or category options. Check your connection and try again.',
        );

        return false;
      } finally {
        setQuickLoading(false);
      }
    }, [
      user,
      quickOptionsLoaded,
      activeSpaces.length,
    ]);

  const openQuickActivity =
    useCallback(async () => {
      if (
        loading
        || quickLoading
        || accounts.length === 0
      ) {
        return;
      }

      const ready =
        await loadQuickOptions();

      if (ready) {
        setShowMoneyActivity(true);
      }
    }, [
      accounts.length,
      loadQuickOptions,
      loading,
      quickLoading,
    ]);

  useEffect(() => {
    void loadAccounts();
  }, [
    loadAccounts,
    lastCompletedAt,
  ]);

  useEffect(() => {
    if (
      !user
      || homeAccounts.length === 0
    ) {
      setActiveAccountIndex(0);
      return;
    }

    const preferredId =
      getPreferredHomeAccountId(
        user.uid,
      );

    const preferredIndex =
      homeAccounts.findIndex(
        (account) =>
          account.id === preferredId,
      );

    const nextIndex =
      preferredIndex >= 0
        ? preferredIndex
        : 0;

    setActiveAccountIndex(
      nextIndex,
    );

    const frame =
      window.requestAnimationFrame(
        () => {
          const carousel =
            accountCarouselRef.current;

          if (!carousel) {
            return;
          }

          carousel.scrollTo({
            left:
              nextIndex
              * (
                carousel.clientWidth
                + 12
              ),
            behavior: 'auto',
          });
        },
      );

    return () =>
      window.cancelAnimationFrame(
        frame,
      );
  }, [
    user,
    homeAccounts,
  ]);

  useEffect(() => {
    void loadAccountActivity(
      activeAccount?.id || null,
    );
  }, [
    activeAccount?.id,
    lastCompletedAt,
    loadAccountActivity,
  ]);

  useEffect(() => {
    if (
      searchParams.get('quick')
        !== '1'
      || loading
      || showMoneyActivity
      || quickLoading
    ) {
      return;
    }

    void openQuickActivity();
  }, [
    loading,
    openQuickActivity,
    quickLoading,
    searchParams,
    showMoneyActivity,
  ]);

  function closeQuickActivity() {
    setShowMoneyActivity(false);

    if (searchParams.has('quick')) {
      const next =
        new URLSearchParams(
          searchParams,
        );

      next.delete('quick');

      setSearchParams(
        next,
        { replace: true },
      );
    }
  }

  function selectHomeAccount(
    index: number,
    behavior:
      ScrollBehavior = 'smooth',
  ) {
    if (
      homeAccounts.length === 0
    ) {
      return;
    }

    const boundedIndex =
      Math.min(
        homeAccounts.length - 1,
        Math.max(
          0,
          index,
        ),
      );

    const account =
      homeAccounts[
        boundedIndex
      ];

    setActiveAccountIndex(
      boundedIndex,
    );

    if (user) {
      setPreferredHomeAccountId(
        user.uid,
        account.id,
      );
    }

    const carousel =
      accountCarouselRef.current;

    if (carousel) {
      carousel.scrollTo({
        left:
          boundedIndex
          * (
            carousel.clientWidth
            + 12
          ),
        behavior,
      });
    }
  }

  function handleAccountCarouselScroll() {
    const carousel =
      accountCarouselRef.current;

    if (
      !carousel
      || homeAccounts.length <= 1
    ) {
      return;
    }

    const pageWidth =
      carousel.clientWidth + 12;

    const nextIndex =
      Math.min(
        homeAccounts.length - 1,
        Math.max(
          0,
          Math.round(
            carousel.scrollLeft
            / Math.max(
              1,
              pageWidth,
            ),
          ),
        ),
      );

    if (
      nextIndex
        === activeAccountIndex
    ) {
      return;
    }

    setActiveAccountIndex(
      nextIndex,
    );

    if (user) {
      setPreferredHomeAccountId(
        user.uid,
        homeAccounts[nextIndex].id,
      );
    }
  }

  function accountMonthSummary(
    accountId: string,
  ) {
    const month =
      monthPrefix();

    const monthly =
      transactions.filter(
        (transaction) =>
          transaction.status === 'posted'
          && transaction.accountId === accountId
          && transaction.transactionDate.startsWith(
            month,
          ),
      );

    return {
      income:
        monthly
          .filter(
            (transaction) =>
              transaction.type === 'income',
          )
          .reduce(
            (sum, transaction) =>
              sum + transaction.amountMinor,
            0,
          ),

      expenses:
        monthly
          .filter(
            (transaction) =>
              transaction.type === 'expense',
          )
          .reduce(
            (sum, transaction) =>
              sum + transaction.amountMinor,
            0,
          ),
    };
  }

  const recentTransactions =
    useMemo(
      () =>
        transactions.slice(
          0,
          20,
        ),
      [transactions],
    );

  const recentIncome =
    recentTransactions
      .filter(
        (item) =>
          item.type === 'income',
      )
      .reduce(
        (sum, item) =>
          sum + item.amountMinor,
        0,
      );

  const recentExpense =
    recentTransactions
      .filter(
        (item) =>
          item.type === 'expense',
      )
      .reduce(
        (sum, item) =>
          sum + item.amountMinor,
        0,
      );

  const firstName =
    profile?.fullName
      ?.trim()
      .split(/\s+/)[0]
    || 'there';

  return (
    <main className="page home-v110">
      <header className="home-v110-header">
        <div>
          <span className="home-v110-kicker">
            Welcome back
          </span>

          <h1>
            Hi, {firstName}
          </h1>
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
          We cannot load your accounts.
          Check your internet connection
          and try again.
        </div>
      )}

      {homeAccounts.length > 0 ? (
        <section className="home-v110-carousel-section">
          <div
            ref={accountCarouselRef}
            className="home-v110-account-carousel"
            onScroll={
              handleAccountCarouselScroll
            }
          >
            {homeAccounts.map(
              (
                account,
                index,
              ) => {
                const accountSubtitle = [
                  account.institution
                    || account.type.replace(
                      '_',
                      ' ',
                    ),
                  account.classification
                    === 'business'
                    ? 'Business'
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                const selected =
                  index
                    === activeAccountIndex;

                const summary =
                  selected
                    ? accountMonthSummary(
                        account.id,
                      )
                    : null;

                return (
                  <article
                    key={account.id}
                    className={
                      `home-v110-balance-card home-v110-account-slide ${accountColorClass(
                        getAccountColor(
                          user?.uid || '',
                          account.id,
                          index,
                        ),
                      )}`
                    }
                  >
                    <div className="home-v110-balance-top">
                      <div>
                        <span>
                          {account.name}
                        </span>

                        <small>
                          {accountSubtitle}
                        </small>
                      </div>

                      <Link to="/accounts">
                        Accounts
                      </Link>
                    </div>

                    <Link
                      className="home-v110-balance-open"
                      to={
                        `/transactions?accountId=${encodeURIComponent(
                          account.id,
                        )}`
                      }
                      aria-label={
                        `View ${account.name} activity`
                      }
                    >
                      <small>
                        Current balance
                      </small>

                      <strong>
                        {loading
                          ? '—'
                          : formatMoney(
                              account
                                .ledgerBalanceMinor,
                              account.currency,
                            )}
                      </strong>
                    </Link>
                    {selected && summary && (
                      <div
                        className="home-v110-balance-stats home-v111-selected-month-summary"
                      >
                        <div>
                          <span>Money in</span>

                          <strong>
                            {activityLoading
                              ? '—'
                              : formatMoney(
                                  summary.income,
                                  account.currency,
                                )}
                          </strong>

                          <small>This month</small>
                        </div>

                        <div>
                          <span>Money out</span>

                          <strong>
                            {activityLoading
                              ? '—'
                              : formatMoney(
                                  summary.expenses,
                                  account.currency,
                                )}
                          </strong>

                          <small>This month</small>
                        </div>
                      </div>
                    )}


                    <div className="home-v111-account-hint">
                      <span>
                        {selected
                          ? 'Activity below follows this account'
                          : 'Swipe to select this account'}
                      </span>

                      <strong>
                        {selected
                          ? 'Selected'
                          : account.currency}
                      </strong>
                    </div>
                  </article>
                );
              },
            )}
          </div>

          {homeAccounts.length > 1 && (
            <div
              className="home-v110-carousel-dots"
              aria-label="Choose account"
            >
              {homeAccounts.map(
                (
                  account,
                  index,
                ) => (
                  <button
                    type="button"
                    key={account.id}
                    className={
                      index
                        === activeAccountIndex
                        ? 'active'
                        : ''
                    }
                    aria-label={
                      `Show ${account.name}`
                    }
                    aria-current={
                      index
                        === activeAccountIndex
                        ? 'true'
                        : undefined
                    }
                    onClick={() =>
                      selectHomeAccount(
                        index,
                      )
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="home-v110-balance-card home-v110-empty-account-card">
          <div className="home-v110-balance-top">
            <div>
              <span>
                No account yet
              </span>

              <small>
                Add your first money account
              </small>
            </div>
          </div>

          <div className="home-v110-balance-value">
            <small>
              Current balance
            </small>

            <strong>
              {formatMoney(
                0,
                currency,
              )}
            </strong>
          </div>

          <Link
            className="button primary"
            to="/accounts"
          >
            Add account
          </Link>
        </section>
      )}

      <section className="home-v110-shortcuts">
        <Link to="/bills">
          <span aria-hidden="true">
            ▤
          </span>

          <strong>Bills</strong>
          <small>Manage</small>
        </Link>

        <Link to="/spaces">
          <span aria-hidden="true">
            ▦
          </span>

          <strong>Spaces</strong>
          <small>Open</small>
        </Link>

        <Link to="/debt">
          <span aria-hidden="true">
            ↔
          </span>

          <strong>Debt</strong>
          <small>Owe & owed</small>
        </Link>

        <Link to="/reports">
          <span aria-hidden="true">
            ⌁
          </span>

          <strong>Reports</strong>
          <small>Insights</small>
        </Link>
      </section>

      <section className="home-v110-section">
        <div className="home-v110-section-heading">
          <div>
            <span>
              {activeAccount
                ? activeAccount.name
                : 'Selected account'}
            </span>

            <h2>
              Money activity
            </h2>
          </div>

          {activeAccount && (
            <Link
              to={
                `/transactions?accountId=${encodeURIComponent(
                  activeAccount.id,
                )}`
              }
            >
              View all
            </Link>
          )}
        </div>

        {activityUnavailable ? (
          <div className="home-v110-empty">
            <span aria-hidden="true">
              !
            </span>

            <strong>
              Activity unavailable
            </strong>

            <p>
              We could not load this
              account's activity.
              Check your connection
              and try again.
            </p>
          </div>
        ) : activityLoading ? (
          <div className="home-v110-empty">
            <span aria-hidden="true">
              …
            </span>

            <strong>
              Loading activity
            </strong>

            <p>
              Loading only the selected
              account.
            </p>
          </div>
        ) : recentTransactions.length > 0 ? (
          <>
            <div className="home-v111-recent-summary">
              <span>
                <small>
                  Recent money in
                </small>

                <strong>
                  {formatMoney(
                    recentIncome,
                    activeAccount?.currency
                      || currency,
                  )}
                </strong>
              </span>

              <span>
                <small>
                  Recent money out
                </small>

                <strong>
                  {formatMoney(
                    recentExpense,
                    activeAccount?.currency
                      || currency,
                  )}
                </strong>
              </span>

              <small>
                Latest {
                  recentTransactions.length
                } entries
              </small>
            </div>

            <div className="home-v110-activity-list">
              {recentTransactions.map(
                (transaction) => (
                  <Link
                    key={transaction.id}
                    to={
                      activeAccount
                        ? `/transactions?accountId=${encodeURIComponent(
                            activeAccount.id,
                          )}`
                        : '/transactions'
                    }
                    className="home-v110-activity-row"
                  >
                    <span
                      className={
                        `home-v110-activity-icon ${transaction.type}`
                      }
                      aria-hidden="true"
                    >
                      {transaction.type
                        === 'income'
                        ? '↓'
                        : transaction.type
                            === 'expense'
                          ? '↑'
                          : '↔'}
                    </span>

                    <span className="home-v110-activity-copy">
                      <strong>
                        {transactionLabel(
                          transaction,
                        )}
                      </strong>

                      <small>
                        {transaction
                          .transactionDate}
                      </small>
                    </span>

                    <b
                      className={
                        transaction.type
                      }
                    >
                      {transaction.type
                        === 'expense'
                        ? '-'
                        : transaction.type
                            === 'income'
                          ? '+'
                          : ''}

                      {formatMoney(
                        transaction
                          .amountMinor,
                        transaction.currency
                          || activeAccount
                            ?.currency
                          || currency,
                      )}
                    </b>
                  </Link>
                ),
              )}
            </div>
          </>
        ) : (
          <div className="home-v110-empty">
            <span aria-hidden="true">
              ◎
            </span>

            <strong>
              {activeAccount
                ? `No activity in ${activeAccount.name} yet`
                : 'No money activity yet'}
            </strong>

            <p>
              Record income or an expense
              and it will appear under
              the selected account.
            </p>

            <button
              type="button"
              className="button primary"
              disabled={
                loading
                || quickLoading
                || accounts.length === 0
              }
              onClick={() =>
                void openQuickActivity()
              }
            >
              {quickLoading
                ? 'Loading…'
                : 'Add income or expense'}
            </button>
          </div>
        )}
      </section>

      <section className="home-v110-secondary-grid">
        <Link to="/budgets">
          <span>Budgets</span>
          <strong>Open</strong>
        </Link>

        <Link to="/goals">
          <span>Goals</span>
          <strong>Open</strong>
        </Link>

        <Link to="/subscription">
          <span>Your plan</span>
          <strong>View</strong>
        </Link>
      </section>

      {showMoneyActivity
        && profile
        && (
          <MoneyActivityModal
            accounts={accounts}
            spaces={activeSpaces}
            categories={
              allCategories
            }
            timezone={
              profile.timezone
            }
            online={online}
            onClose={
              closeQuickActivity
            }
            onSubmit={postTransaction}
            onComplete={async (
              message,
              refresh,
            ) => {
              closeQuickActivity();
              setFeedback(message);

              if (refresh) {
                await loadAccounts();

                await loadAccountActivity(
                  activeAccount?.id
                    || null,
                );
              }
            }}
          />
        )}
    </main>
  );
}
