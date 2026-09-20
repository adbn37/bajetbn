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
import { Modal } from '../components/Modal';
import { shareTransactionToWhatsApp } from '../services/transactionShare';
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
import {
  DEFAULT_TRANSACTION_CATEGORIES,
  categoryIconGlyph,
} from '../features/categories/defaultCategories';
import { MoneyActivityModal } from '../features/transactions/TransactionsPage';
import { AccountAvatar } from '../features/accounts/AccountAvatar';

function monthPrefix() {
  return new Date()
    .toISOString()
    .slice(0, 7);
}

function homeGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function profileInitials(name: string) {
  const parts = name
    .trim()
    .split(/s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.length > 0
    ? parts
        .map((part) => part[0]?.toUpperCase() || '')
        .join('')
    : 'B';
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

function homeActivityTitle(
  transaction: FinancialTransaction,
) {
  return (
    transaction.counterparty?.trim()
    || transaction.note?.trim()
    || transaction.category?.trim()
    || transactionLabel(transaction)
  );
}

function homeActivityDate(
  value: string,
) {
  const parts =
    value.split('-');

  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      'en-BN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Brunei',
      },
    ).format(
      new Date(
        Date.UTC(
          year,
          month - 1,
          day,
          4,
        ),
      ),
    );
  } catch {
    return value;
  }
}

function homeActivityMeta(
  transaction: FinancialTransaction,
) {
  const title =
    homeActivityTitle(
      transaction,
    );

  return [
    transactionLabel(transaction),
    transaction.category
      && transaction.category !== title
      ? transaction.category
      : '',
    homeActivityDate(
      transaction.transactionDate,
    ),
  ]
    .filter(Boolean)
    .join(' Â· ');
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

  const welcomeFromOnboarding =
    searchParams.get('welcome') === '1';

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
    selectedActivity,
    setSelectedActivity,
  ] = useState<FinancialTransaction | null>(null);

  const [
    selectedActivitySpaceName,
    setSelectedActivitySpaceName,
  ] = useState('');

  const [
    activityDetailLoading,
    setActivityDetailLoading,
  ] = useState(false);

  const [
    showMoneyActivity,
    setShowMoneyActivity,
  ] = useState(false);

  const [
    quickInitialType,
    setQuickInitialType,
  ] = useState<'expense' | 'income' | 'transfer'>('expense');

  const [
    quickEntryMode,
    setQuickEntryMode,
  ] = useState<'activity' | 'move' | 'receipt'>('activity');

  const [
    assetsVisible,
    setAssetsVisible,
  ] = useState(true);

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

  const accountDragRef =
    useRef({
      active: false,
      pointerId: -1,
      startX: 0,
      startScrollLeft: 0,
      moved: false,
    });

  const currency =
    profile?.currency || 'BND';

  const homeAccounts =
    useMemo(
      () =>
        accounts
          .filter(
            (account) =>
              account.classification
                === 'personal',
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
              ),
          ),
      [accounts],
    );

  /*
   * Personal Home is strictly Personal-account only.
   * Business accounts belong to the dedicated Business Home
   * and never appear in the Personal Home account carousel.
   *
   * Global Add remains personal-first as well.
   */
  const quickAccounts =
    useMemo(
      () =>
        accounts.filter(
          (account) =>
            account.classification
              === 'personal',
        ),
      [accounts],
    );

  const personalAssetAccounts =
    useMemo(
      () =>
        quickAccounts.filter(
          (account) =>
            account.type !== 'credit_card',
        ),
      [quickAccounts],
    );

  const totalPersonalAssets =
    useMemo(
      () =>
        personalAssetAccounts.reduce(
          (sum, account) =>
            sum + account.ledgerBalanceMinor,
          0,
        ),
      [personalAssetAccounts],
    );

  const personalAssetBreakdown =
    useMemo(
      () => {
        let bank = 0;
        let cash = 0;
        let savings = 0;
        let investments = 0;
        let other = 0;

        personalAssetAccounts.forEach(
          (account) => {
            const name =
              account.name.toLowerCase();

            if (/invest|investment/.test(name)) {
              investments += account.ledgerBalanceMinor;
              return;
            }

            if (/saving|savings/.test(name)) {
              savings += account.ledgerBalanceMinor;
              return;
            }

            if (account.type === 'cash') {
              cash += account.ledgerBalanceMinor;
              return;
            }

            if (account.type === 'bank') {
              bank += account.ledgerBalanceMinor;
              return;
            }

            other += account.ledgerBalanceMinor;
          },
        );

        const groups: Array<[string, number]> = [
          ['Bank', bank],
          ['Cash', cash],
          ['Savings', savings],
          ['Investments', investments],
        ];

        if (other !== 0) {
          groups.push(['Other', other]);
        }

        return groups;
      },
      [personalAssetAccounts],
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

        setSpaces(nextSpaces.filter((item) => !item.archivedAt && item.type !== 'sme'));
        setCustomCategories(
          nextCategories,
        );
        setQuickOptionsLoaded(true);

        const personalBudget =
          nextActiveSpaces.find(
            (item) => item.type === 'personal',
          );

        if (!personalBudget) {
          setFeedback(
            'Your personal budget is not ready yet. Refresh BajetBN and try again.',
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
    useCallback(async (
      entryMode: 'activity' | 'move' | 'receipt' = 'activity',
    ) => {
      if (
        loading
        || quickLoading
        || quickAccounts.length === 0
        || (
          entryMode === 'move'
          && quickAccounts.length < 2
        )
      ) {
        return;
      }

      setQuickEntryMode(entryMode);
      setQuickInitialType(
        entryMode === 'move'
          ? 'transfer'
          : 'expense',
      );

      const ready =
        await loadQuickOptions();

      if (ready) {
        setShowMoneyActivity(true);
      }
    }, [
      quickAccounts.length,
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
      const card =
        carousel.children[
          boundedIndex
        ] as HTMLElement | undefined;

      if (card) {
        carousel.scrollTo({
          left: Math.max(
            0,
            card.offsetLeft
            - carousel.offsetLeft,
          ),
          behavior,
        });
      }
    }
  }

  function handleAccountDragStart(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const carousel =
      accountCarouselRef.current;

    if (
      !carousel
      || homeAccounts.length <= 1
      || event.pointerType === 'touch'
    ) {
      return;
    }

    accountDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: carousel.scrollLeft,
      moved: false,
    };

    carousel.setPointerCapture(
      event.pointerId,
    );

    carousel.classList.add(
      'dragging',
    );
  }

  function handleAccountDragMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const carousel =
      accountCarouselRef.current;

    const drag =
      accountDragRef.current;

    if (
      !carousel
      || !drag.active
      || drag.pointerId !== event.pointerId
    ) {
      return;
    }

    const delta =
      event.clientX - drag.startX;

    if (Math.abs(delta) > 4) {
      drag.moved = true;
    }

    carousel.scrollLeft =
      drag.startScrollLeft - delta;
  }

  function handleAccountDragEnd(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const carousel =
      accountCarouselRef.current;

    const drag =
      accountDragRef.current;

    if (
      !carousel
      || drag.pointerId !== event.pointerId
    ) {
      return;
    }

    if (
      carousel.hasPointerCapture(
        event.pointerId,
      )
    ) {
      carousel.releasePointerCapture(
        event.pointerId,
      );
    }

    carousel.classList.remove(
      'dragging',
    );

    accountDragRef.current = {
      active: false,
      pointerId: -1,
      startX: 0,
      startScrollLeft: carousel.scrollLeft,
      moved: drag.moved,
    };
  }

  function handleAccountCardClick(
    index: number,
  ) {
    if (accountDragRef.current.moved) {
      accountDragRef.current.moved = false;
      return;
    }

    selectHomeAccount(index);
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

    const cards =
      Array.from(
        carousel.children,
      ) as HTMLElement[];

    let nextIndex = 0;
    let nearestDistance =
      Number.POSITIVE_INFINITY;

    cards.forEach(
      (card, index) => {
        const distance =
          Math.abs(
            card.offsetLeft
            - carousel.offsetLeft
            - carousel.scrollLeft,
          );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nextIndex = index;
        }
      },
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

  const openHomeActivityDetails =
    useCallback(
      async (
        transaction: FinancialTransaction,
      ) => {
        setSelectedActivity(
          transaction,
        );

        setSelectedActivitySpaceName(
          '',
        );

        if (!user) {
          return;
        }

        setActivityDetailLoading(true);

        try {
          const nextSpaces =
            await listSpaces(
              user.uid,
            );

          const transactionSpace =
            nextSpaces.find(
              (space) =>
                space.id
                  === transaction.spaceId,
            );

          setSelectedActivitySpaceName(
            transactionSpace?.type
              === 'personal'
              ? 'Personal'
              : transactionSpace?.name
                || 'Unknown Space',
          );
        } catch {
          setSelectedActivitySpaceName(
            'Unknown Space',
          );
        } finally {
          setActivityDetailLoading(false);
        }
      },
      [user],
    );

  const selectedActivitySource =
    selectedActivity
      ? accounts.find(
          (account) =>
            account.id
              === selectedActivity.accountId,
        )
      : undefined;

  const selectedActivityDestination =
    selectedActivity
      && selectedActivity.destinationAccountId
      ? accounts.find(
          (account) =>
            account.id
              === selectedActivity.destinationAccountId,
        )
      : undefined;

  const firstName =
    profile?.fullName
      ?.trim()
      .split(/\s+/)[0]
    || 'there';

  return (
    <main className="page home-v110 bajetbn-reference-home">
      <header className="bajetbn-home-profile-header">
        <div className="bajetbn-home-profile">
          <span className="bajetbn-home-avatar" aria-hidden="true">
            {profileInitials(profile?.fullName || firstName)}
          </span>

          <div>
            <small>
              {homeGreeting()},
            </small>
            <strong>
              {firstName}
            </strong>
          </div>
        </div>

        <div className="bajetbn-home-header-actions">
          <Link
            to="/search"
            aria-label="Search BajetBN"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="11"
                cy="11"
                r="6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="m16 16 4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </Link>

          <Link
            to="/notifications"
            aria-label="Open notifications"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6.5 9.5a5.5 5.5 0 0 1 11 0v4.1l1.5 2.4H5l1.5-2.4V9.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M10 19h4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </div>
      </header>

      {welcomeFromOnboarding && (
        <div className="notice success">
          <strong>Your budget is ready.</strong>
          <span>Add an account, then start recording money. Spaces are optional.</span>
        </div>
      )}

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

      <section
        className="bajetbn-total-assets-card bajetbn-home-assets-hero"
        aria-label="Personal total assets"
      >
        <div className="bajetbn-total-assets-head">
          <div>
            <span>Total Assets</span>
            <small>Personal only Â· Business excluded</small>
          </div>

          <button
            type="button"
            className="bajetbn-asset-visibility"
            aria-label={assetsVisible ? 'Hide total assets' : 'Show total assets'}
            onClick={() =>
              setAssetsVisible(
                (current) => !current,
              )
            }
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 12s3.4-5 9-5 9 5 9 5-3.4 5-9 5-9-5-9-5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <circle
                cx="12"
                cy="12"
                r="2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </button>
        </div>

        <strong className="bajetbn-total-assets-value">
          {assetsVisible
            ? formatMoney(
                totalPersonalAssets,
                currency,
              )
            : 'â€¢â€¢â€¢â€¢â€¢â€¢'}
        </strong>

        <div
          className="bajetbn-home-assets-accent"
          aria-hidden="true"
        />

        <div className="bajetbn-total-assets-breakdown">
          {personalAssetBreakdown.map(
            ([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>
                  {assetsVisible
                    ? formatMoney(
                        value,
                        currency,
                      ).replace(
                        currency + ' ',
                        '',
                      )
                    : 'â€¢â€¢â€¢â€¢'}
                </strong>
              </div>
            ),
          )}
        </div>
      </section>

      {homeAccounts.length > 0 ? (
        <section className="bajetbn-home-accounts-section">
          <div className="bajetbn-home-section-title">
            <h2>Accounts</h2>
            <Link to="/accounts">See all</Link>
          </div>

          <div
            ref={accountCarouselRef}
            className="bajetbn-home-account-strip"
            onScroll={handleAccountCarouselScroll}
            onPointerDown={handleAccountDragStart}
            onPointerMove={handleAccountDragMove}
            onPointerUp={handleAccountDragEnd}
            onPointerCancel={handleAccountDragEnd}
          >
            {homeAccounts.map(
              (
                account,
                index,
              ) => {
                const selected =
                  index === activeAccountIndex;

                const subtitle = [
                  account.institution
                    || account.type.replace(
                      '_',
                      ' ',
                    ),
                  account.classification === 'business'
                    ? 'Business'
                    : null,
                ]
                  .filter(Boolean)
                  .join(' Â· ');

                return (
                  <button
                    key={account.id}
                    type="button"
                    className={
                      'bajetbn-home-account-card '
                      + accountColorClass(
                          getAccountColor(
                            user?.uid || '',
                            account.id,
                            index,
                          ),
                        )
                      + (selected ? ' selected' : '')
                    }
                    aria-pressed={selected}
                    onClick={() =>
                      handleAccountCardClick(index)
                    }
                  >
                    <span className="bajetbn-home-account-card-head">
                      <AccountAvatar
                        account={account}
                        className="bajetbn-home-account-mark"
                      />

                      <span>
                        <strong>{account.name}</strong>
                        <small>{subtitle}</small>
                      </span>
                    </span>

                    <b>
                      {loading
                        ? 'â€”'
                        : formatMoney(
                            account.ledgerBalanceMinor,
                            account.currency,
                          )}
                    </b>
                  </button>
                );
              },
            )}
          </div>
        </section>
      ) : (
        <section className="bajetbn-home-accounts-section">
          <div className="bajetbn-home-section-title">
            <h2>Accounts</h2>
          </div>

          <Link
            className="bajetbn-home-empty-account"
            to="/accounts"
          >
            <strong>Add your first account</strong>
            <small>
              Bank, cash and e-wallet accounts appear here.
            </small>
          </Link>
        </section>
      )}

      <section className="home-v110-shortcuts bajetbn-reference-actions bajetbn-reference-actions-four">
        <button
          type="button"
          disabled={quickAccounts.length < 2}
          onClick={() =>
            void openQuickActivity('move')
          }
        >
          <span aria-hidden="true">M</span>
          <strong>Move</strong>
          <small>Money</small>
        </button>

        <button
          type="button"
          onClick={() =>
            void openQuickActivity('receipt')
          }
        >
          <span aria-hidden="true">R</span>
          <strong>Scan</strong>
          <small>Receipt</small>
        </button>

        <Link to="/bills">
          <span aria-hidden="true">B</span>
          <strong>Bills</strong>
          <small>Manage</small>
        </Link>

        <Link to="/debt">
          <span aria-hidden="true">D</span>
          <strong>Debt</strong>
          <small>Owe & owed</small>
        </Link>
      </section>

      <section className="home-v110-section bajetbn-home-recent-section">
        <div className="bajetbn-home-section-title">
          <h2>Recent Activity</h2>

          {activeAccount && (
            <Link
              to={
                '/transactions?accountId='
                + encodeURIComponent(
                    activeAccount.id,
                  )
              }
            >
              See all
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
              â€¦
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
            <div className="home-v110-activity-list">
              {recentTransactions.map(
                (transaction) => (
                  <button
                    key={transaction.id}
                    type="button"
                    className="home-v110-activity-row home-v1147-activity-button"
                    aria-label={`Open details for ${homeActivityTitle(transaction)}`}
                    onClick={() =>
                      void openHomeActivityDetails(
                        transaction,
                      )
                    }
                  >
                    <span
                      className={
                        'home-v110-activity-icon '
                        + transaction.type
                        + ' category-'
                        + (transaction.categoryColor || 'slate')
                      }
                      aria-hidden="true"
                    >
                      {categoryIconGlyph(
                        transaction.categoryIcon
                        || (
                          transaction.type === 'transfer'
                            ? 'transfer'
                            : transaction.type === 'income'
                              ? 'wallet'
                              : 'dots'
                        ),
                      )}
                    </span>

                    <span className="home-v110-activity-copy">
                      <strong>
                        {homeActivityTitle(
                          transaction,
                        )}
                      </strong>

                      <small>
                        {[
                          transaction.category
                            || transactionLabel(transaction),
                          activeAccount?.name,
                        ]
                          .filter(Boolean)
                          .join(' Â· ')}
                      </small>
                    </span>

                    <span className="bajetbn-home-activity-value">
                      <b className={transaction.type}>
                        {transaction.type
                          === 'expense'
                          ? '-'
                          : transaction.type === 'income'
                            ? '+'
                            : ''}

                        {formatMoney(
                          transaction.amountMinor,
                          transaction.currency
                            || activeAccount?.currency
                            || currency,
                        )}
                      </b>

                      <small>
                        {homeActivityDate(
                          transaction.transactionDate,
                        )}
                      </small>
                    </span>
                  </button>
                ),
              )}
            </div>
          </>
        ) : (
          <div className="home-v110-empty">
            <span aria-hidden="true">
              â—Ž
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
                || quickAccounts.length === 0
              }
              onClick={() =>
                void openQuickActivity()
              }
            >
              {quickLoading
                ? 'Loadingâ€¦'
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

        <Link
          to="/bills"
          className="bajetbn-desktop-side-extra"
        >
          <span>Upcoming bills</span>
          <strong>Review</strong>
        </Link>

        <Link
          to="/inbox"
          className="bajetbn-desktop-side-extra"
        >
          <span>Needs attention</span>
          <strong>Open</strong>
        </Link>
      </section>

      {selectedActivity && (
        <Modal
          title="Money activity details"
          onClose={() =>
            setSelectedActivity(null)
          }
        >
          <div className="home-v1147-activity-detail">
            <div className="home-v1147-activity-detail-head">
              <div>
                <strong>
                  {homeActivityTitle(
                    selectedActivity,
                  )}
                </strong>

                <small>
                  {transactionLabel(
                    selectedActivity,
                  )}
                </small>
              </div>

              <b
                className={
                  selectedActivity.type
                }
              >
                {selectedActivity.type === 'expense'
                  ? '-'
                  : selectedActivity.type === 'income'
                    ? '+'
                    : ''}
                {formatMoney(
                  selectedActivity.amountMinor,
                  selectedActivity.currency
                    || selectedActivitySource?.currency
                    || currency,
                )}
              </b>
            </div>

            <dl className="home-v1147-activity-detail-list">
              <div>
                <dt>Space</dt>
                <dd>
                  {activityDetailLoading
                    ? 'Loadingâ€¦'
                    : selectedActivitySpaceName
                      || 'Unknown Space'}
                </dd>
              </div>

              <div>
                <dt>Account</dt>
                <dd>
                  {selectedActivitySource?.name
                    || 'Unknown Account'}
                  {selectedActivityDestination
                    ? ` â†’ ${selectedActivityDestination.name}`
                    : ''}
                </dd>
              </div>

              <div>
                <dt>Category</dt>
                <dd>
                  {selectedActivity.category
                    || transactionLabel(selectedActivity)}
                </dd>
              </div>

              <div>
                <dt>Date</dt>
                <dd>
                  {homeActivityDate(
                    selectedActivity.transactionDate,
                  )}
                </dd>
              </div>

              {selectedActivity.counterparty && (
                <div>
                  <dt>
                    {selectedActivity.type === 'income'
                      ? 'From'
                      : 'Paid to'}
                  </dt>
                  <dd>
                    {selectedActivity.counterparty}
                  </dd>
                </div>
              )}

              {selectedActivity.note && (
                <div>
                  <dt>Note</dt>
                  <dd>
                    {selectedActivity.note}
                  </dd>
                </div>
              )}
            </dl>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  setSelectedActivity(null)
                }
              >
                Close
              </button>

              {selectedActivity.type !== 'reversal' && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() =>
                    shareTransactionToWhatsApp({
                      transactionId:
                        selectedActivity.id,
                      type:
                        selectedActivity.type,
                      amountMinor:
                        selectedActivity.amountMinor,
                      currency:
                        selectedActivity.currency
                        || selectedActivitySource?.currency
                        || currency,
                      transactionDate:
                        selectedActivity.transactionDate,
                      category:
                        selectedActivity.category,
                      counterparty:
                        selectedActivity.counterparty,
                      note:
                        selectedActivity.note,
                      spaceName:
                        selectedActivitySpaceName
                        || undefined,
                      sourceAccountName:
                        selectedActivitySource?.name,
                      destinationAccountName:
                        selectedActivityDestination?.name,
                    })
                  }
                >
                  Share to WhatsApp
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showMoneyActivity
        && profile
        && (
          <MoneyActivityModal
            accounts={quickAccounts}
            spaces={activeSpaces}
            categories={
              allCategories
            }
            timezone={
              profile.timezone
            }
            online={online}
            initialType={quickInitialType}
            entryMode={quickEntryMode}
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
