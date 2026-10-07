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
import {
  accountSupportsPersonalUse,
  listAccounts,
} from '../repositories/accountRepository';
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
import {
  MoneyActivityModal,
} from '../features/transactions/TransactionsPage';
import { AccountAvatar } from '../features/accounts/AccountAvatar';
import { SpaceAvatar } from '../features/spaces/SpaceAvatar';
import { GlobalBusinessOverview } from '../features/business/GlobalBusinessOverview';

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
    .join(' · ');
}

type HomeShortcutId =
  | 'trips'
  | 'bills'
  | 'receipt'
  | 'budgets'
  | 'recurring'
  | 'subscription'
  | 'accounts'
  | 'reports'
  | 'debt'
  | 'goals'
  | 'inbox'
  | `space:${string}`;

type HomeShortcutChoice = {
  id: HomeShortcutId;
  label: string;
  description: string;
  icon: string;
  route?: string;
  action?: 'trips' | 'receipt';
};

const HOME_SHORTCUT_DEFAULTS: HomeShortcutId[] = [
  'trips',
  'bills',
  'goals',
  'budgets',
  'recurring',
  'subscription',
];

const HOME_SHORTCUT_CHOICES: HomeShortcutChoice[] = [
  {
    id: 'trips',
    label: 'Trips',
    description: 'All trips',
    icon: 'T',
    action: 'trips',
  },
  {
    id: 'bills',
    label: 'Bills',
    description: 'Manage',
    icon: 'B',
    route: '/bills',
  },
  {
    id: 'receipt',
    label: 'Receipt',
    description: 'Add or scan',
    icon: 'R',
    action: 'receipt',
  },
  {
    id: 'budgets',
    label: 'Budgets',
    description: 'Plan spending',
    icon: 'B',
    route: '/budgets',
  },
  {
    id: 'recurring',
    label: 'Recurring',
    description: 'Automate',
    icon: '↻',
    route: '/recurring',
  },
  {
    id: 'subscription',
    label: 'Subscription',
    description: 'Account plan',
    icon: 'P',
    route: '/subscription',
  },
  {
    id: 'accounts',
    label: 'Accounts',
    description: 'Manage',
    icon: 'A',
    route: '/accounts',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Insights',
    icon: 'R',
    route: '/reports',
  },
  {
    id: 'debt',
    label: 'Debt',
    description: 'Track',
    icon: 'D',
    route: '/debt',
  },
  {
    id: 'goals',
    label: 'Goals',
    description: 'Plan & save',
    icon: 'G',
    route: '/goals',
  },
  {
    id: 'inbox',
    label: 'Needs Attention',
    description: 'Inbox',
    icon: '!',
    route: '/inbox',
  },
];

const HOME_SHORTCUT_STORAGE_PREFIX =
  'bajetbn.homeShortcuts.v116.';

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

  const homeMode =
    searchParams.get('home') === 'business'
      ? 'business'
      : 'personal';

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
    homeSpacePicker,
    setHomeSpacePicker,
  ] = useState<'personal' | 'business' | null>(null);

  const [
    showTripPicker,
    setShowTripPicker,
  ] = useState(false);

  const [
    showShortcutEditor,
    setShowShortcutEditor,
  ] = useState(false);

  const [
    homeShortcutIds,
    setHomeShortcutIds,
  ] = useState<HomeShortcutId[]>(
    [...HOME_SHORTCUT_DEFAULTS],
  );

  const [
    homeShortcutDraft,
    setHomeShortcutDraft,
  ] = useState<HomeShortcutId[]>(
    [...HOME_SHORTCUT_DEFAULTS],
  );

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
              accountSupportsPersonalUse(
                account,
              ),
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
   * Personal Home includes Personal accounts plus explicitly
   * Personal + Business accounts. Pure Business-only accounts
   * remain inside their Business Spaces.
   */
  const quickAccounts =
    useMemo(
      () =>
        accounts.filter(
          (account) =>
            accountSupportsPersonalUse(
              account,
            ),
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

  const quickPersonalSpaces =
    useMemo(
      () =>
        activeSpaces
          .filter(
            (item) =>
              item.type !== 'sme'
              && item.type !== 'goal',
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name),
          ),
      [activeSpaces],
    );

  // The Personal Home picker is for Personal and Household Spaces.
  // Keep Trip Spaces available separately in the Trips picker and money entry.
  const personalPickerSpaces =
    useMemo(
      () =>
        quickPersonalSpaces
          .filter(
            (item) => item.type !== 'trip',
          )
          .sort((a, b) => {
            if (a.type === 'personal') {
              return b.type === 'personal' ? 0 : -1;
            }
            if (b.type === 'personal') return 1;
            return a.name.localeCompare(b.name);
          }),
      [quickPersonalSpaces],
    );

  const businessSpaces =
    useMemo(
      () =>
        activeSpaces
          .filter(
            (item) =>
              item.type === 'sme',
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name),
          ),
      [activeSpaces],
    );

  const personalTripSpaces =
    useMemo(
      () =>
        activeSpaces
          .filter(
            (item) => item.type === 'trip',
          )
          .sort(
            (a, b) => a.name.localeCompare(b.name),
          ),
      [activeSpaces],
    );

  const homeShortcutChoices =
    useMemo<HomeShortcutChoice[]>(
      () => [
        ...HOME_SHORTCUT_CHOICES,
        ...activeSpaces
          .filter(
            (space) =>
              space.type !== 'goal'
              && space.type !== 'personal',
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name),
          )
          .map((space) => ({
            id: `space:${space.id}` as HomeShortcutId,
            label: space.name,
            description:
              space.type === 'sme'
                ? 'Business'
                : space.type === 'household'
                  ? 'Household'
                  : space.type === 'trip'
                    ? 'Trip'
                    : 'Space',
            icon:
              space.type === 'sme'
                ? 'B'
                : space.type === 'household'
                  ? 'H'
                  : space.type === 'trip'
                    ? 'T'
                    : 'S',
            route:
              space.type === 'sme'
                ? '/business/' + space.id
                : '/spaces/' + space.id,
          })),
      ],
      [activeSpaces],
    );

  const resolvedHomeShortcuts =
    useMemo(
      () =>
        homeShortcutIds.map(
          (shortcutId, index) =>
            homeShortcutChoices.find(
              (choice) =>
                choice.id === shortcutId,
            )
            || homeShortcutChoices.find(
              (choice) =>
                choice.id
                  === HOME_SHORTCUT_DEFAULTS[index],
            )
            || HOME_SHORTCUT_CHOICES[index],
        ),
      [
        homeShortcutChoices,
        homeShortcutIds,
      ],
    );

  useEffect(() => {
    if (!user) {
      setHomeShortcutIds(
        [...HOME_SHORTCUT_DEFAULTS],
      );
      setHomeShortcutDraft(
        [...HOME_SHORTCUT_DEFAULTS],
      );
      return;
    }

    try {
      const raw =
        window.localStorage.getItem(
          HOME_SHORTCUT_STORAGE_PREFIX
            + user.uid,
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : null;

      if (
        Array.isArray(parsed)
        && parsed.length
          === HOME_SHORTCUT_DEFAULTS.length
        && parsed.every(
          (item) =>
            typeof item === 'string',
        )
      ) {
        setHomeShortcutIds(
          parsed as HomeShortcutId[],
        );
        return;
      }
    } catch {
      // Fall back to defaults if local shortcut preferences are invalid.
    }

    setHomeShortcutIds(
      [...HOME_SHORTCUT_DEFAULTS],
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    void listSpaces(user.uid)
      .then((items) => {
        if (cancelled) return;

        setSpaces(
          items.filter(
            (item) => !item.archivedAt,
          ),
        );
      })
      .catch(() => {
        // Trip shortcuts are enhancement-only.
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

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

        setSpaces(nextActiveSpaces);
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
      homeMode !== 'personal'
      || searchParams.get('quick')
        !== '1'
      || loading
      || showMoneyActivity
      || quickLoading
    ) {
      return;
    }

    void openQuickActivity();
  }, [
    homeMode,
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
      || (
        carousel.scrollWidth
        <= carousel.clientWidth + 1
      )
    ) {
      return;
    }

    /*
     * Do not capture the pointer or enable .dragging yet.
     * A normal mouse click must remain a button click.
     * Drag mode starts only after real horizontal movement.
     */
    accountDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: carousel.scrollLeft,
      moved: false,
    };
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

    if (
      Math.abs(delta) > 4
      && !drag.moved
    ) {
      drag.moved = true;

      if (
        !carousel.hasPointerCapture(
          event.pointerId,
        )
      ) {
        carousel.setPointerCapture(
          event.pointerId,
        );
      }

      carousel.classList.add(
        'dragging',
      );
    }

    if (!drag.moved) {
      return;
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

  function selectHomeMode(
    nextMode: 'personal' | 'business',
  ) {
    const next =
      new URLSearchParams(
        searchParams,
      );

    if (nextMode === 'business') {
      next.set(
        'home',
        'business',
      );
    } else {
      next.delete('home');
    }

    next.delete('quick');

    setSelectedActivity(null);
    setShowMoneyActivity(false);

    setSearchParams(
      next,
      { replace: true },
    );
  }

  function openHomeSpacePicker(
    nextMode: 'personal' | 'business',
  ) {
    setHomeSpacePicker(nextMode);
  }

  function openShortcutEditor() {
    setHomeShortcutDraft(
      homeShortcutIds.map(
        (shortcutId, index) =>
          homeShortcutChoices.some(
            (choice) =>
              choice.id === shortcutId,
          )
            ? shortcutId
            : HOME_SHORTCUT_DEFAULTS[index],
      ),
    );

    setShowShortcutEditor(true);
  }

  function saveShortcutEditor() {
    const next =
      homeShortcutDraft.length
        === HOME_SHORTCUT_DEFAULTS.length
        ? [...homeShortcutDraft]
        : [...HOME_SHORTCUT_DEFAULTS];

    setHomeShortcutIds(next);

    if (user) {
      window.localStorage.setItem(
        HOME_SHORTCUT_STORAGE_PREFIX
          + user.uid,
        JSON.stringify(next),
      );
    }

    setShowShortcutEditor(false);
  }

  function resetShortcutEditor() {
    setHomeShortcutDraft(
      [...HOME_SHORTCUT_DEFAULTS],
    );
  }

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

      {homeMode === 'personal' && dataUnavailable && (
        <div className="notice">
          We cannot load your accounts.
          Check your internet connection
          and try again.
        </div>
      )}


      <nav
        className="bajetbn-home-mode-switch-v115"
        data-home-mode-switch-v115
        aria-label="Home view"
      >
        <div
          className={
            'bajetbn-home-mode-option-v116 '
            + (
              homeMode === 'personal'
                ? 'active'
                : ''
            )
          }
        >
          <button
            type="button"
            className="bajetbn-home-mode-overview-v116"
            aria-pressed={
              homeMode === 'personal'
            }
            data-home-overview-trigger-v116="personal"
            onClick={() =>
              selectHomeMode('personal')
            }
          >
            Personal
          </button>

          <button
            type="button"
            className="bajetbn-home-mode-picker-v116"
            aria-label="Choose Personal Space"
            aria-haspopup="dialog"
            aria-expanded={
              homeSpacePicker === 'personal'
            }
            data-home-space-picker-trigger-v116="personal"
            onClick={() =>
              openHomeSpacePicker('personal')
            }
          >
            <span aria-hidden="true">⌄</span>
          </button>
        </div>

        <div
          className={
            'bajetbn-home-mode-option-v116 '
            + (
              homeMode === 'business'
                ? 'active'
                : ''
            )
          }
        >
          <button
            type="button"
            className="bajetbn-home-mode-overview-v116"
            aria-pressed={
              homeMode === 'business'
            }
            data-home-overview-trigger-v116="business"
            onClick={() =>
              selectHomeMode('business')
            }
          >
            Business
          </button>

          <button
            type="button"
            className="bajetbn-home-mode-picker-v116"
            aria-label="Choose Business Space"
            aria-haspopup="dialog"
            aria-expanded={
              homeSpacePicker === 'business'
            }
            data-home-space-picker-trigger-v116="business"
            onClick={() =>
              openHomeSpacePicker('business')
            }
          >
            <span aria-hidden="true">⌄</span>
          </button>
        </div>
      </nav>

      {homeMode === 'personal' ? (
        <>
      <section
        className="bajetbn-total-assets-card bajetbn-home-assets-hero"
        aria-label="Personal total assets"
      >
        <div className="bajetbn-total-assets-head">
          <div>
            <span>Total Assets</span>
            <small>Personal + explicitly shared global accounts · Business-only excluded</small>
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
            : '••••••'}
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
                    : '••••'}
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
                  account.personalUseEnabled === true
                    ? 'Personal + Business'
                    : account.classification === 'business'
                      ? 'Business'
                      : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

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
                        ? '—'
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

      <section
        className="home-shortcut-hub-v116"
        data-home-shortcut-hub-v116
      >
        <div className="home-shortcut-heading-v116">
          <strong>Shortcuts</strong>

          <button
            type="button"
            className="text-button"
            onClick={openShortcutEditor}
          >
            Edit shortcuts
          </button>
        </div>

        <div
          className="home-v110-shortcuts bajetbn-reference-actions bajetbn-reference-actions-six"
          data-home-shortcut-grid-v116
        >
          {resolvedHomeShortcuts.map(
            (shortcut, index) => {
              const description =
                shortcut.id === 'trips'
                  ? (
                    personalTripSpaces.length > 0
                      ? personalTripSpaces.length
                        + ' active'
                      : 'No active trips'
                  )
                  : shortcut.description;

              const content = (
                <>
                  <span aria-hidden="true">
                    {shortcut.icon}
                  </span>
                  <strong>
                    {shortcut.label}
                  </strong>
                  <small>
                    {description}
                  </small>
                </>
              );

              if (
                shortcut.action
                  === 'trips'
              ) {
                return (
                  <button
                    type="button"
                    data-trip-picker-v116
                    key={
                      shortcut.id
                      + '-'
                      + index
                    }
                    onClick={() =>
                      setShowTripPicker(true)
                    }
                  >
                    {content}
                  </button>
                );
              }

              if (
                shortcut.action
                  === 'receipt'
              ) {
                return (
                  <button
                    type="button"
                    key={
                      shortcut.id
                      + '-'
                      + index
                    }
                    onClick={() =>
                      void openQuickActivity(
                        'receipt',
                      )
                    }
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  to={shortcut.route || '/'}
                  key={
                    shortcut.id
                    + '-'
                    + index
                  }
                >
                  {content}
                </Link>
              );
            },
          )}
        </div>
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
                          .join(' · ')}
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
                || quickAccounts.length === 0
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

      <section className="home-v110-secondary-grid bajetbn-desktop-secondary-only-v116">
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
                    ? 'Loading…'
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
                    ? ` → ${selectedActivityDestination.name}`
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
            spaces={quickPersonalSpaces}
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
        </>
      ) : (
        <GlobalBusinessOverview
          userId={user?.uid || ''}
          currency={currency}
        />
      )}

      {homeSpacePicker && (
        <Modal
          title={
            homeSpacePicker === 'personal'
              ? 'Personal Spaces'
              : 'Businesses'
          }
          onClose={() =>
            setHomeSpacePicker(null)
          }
        >
          <div
            className="home-space-picker-list-v116"
            data-home-space-picker-v116={homeSpacePicker}
          >
            {homeSpacePicker === 'personal' ? (
              personalPickerSpaces.length > 0 ? (
                personalPickerSpaces.map((space) =>
                  space.type === 'personal' ? (
                    <button
                      type="button"
                      className="home-space-picker-row-v116"
                      key={space.id}
                      onClick={() => {
                        setHomeSpacePicker(null);
                        selectHomeMode('personal');
                      }}
                    >
                      <SpaceAvatar space={space} />
                      <span>
                        <strong>Personal</strong>
                        <small>Personal</small>
                      </span>
                      <b aria-hidden="true">›</b>
                    </button>
                  ) : (
                    <Link
                      to={'/spaces/' + space.id}
                      className="home-space-picker-row-v116"
                      key={space.id}
                      onClick={() =>
                        setHomeSpacePicker(null)
                      }
                    >
                      <SpaceAvatar space={space} />
                      <span>
                        <strong>{space.name}</strong>
                        <small>
                          {space.type === 'household'
                            ? 'Household'
                            : 'Space'}
                        </small>
                      </span>
                      <b aria-hidden="true">›</b>
                    </Link>
                  ),
                )
              ) : (
                <p className="muted">
                  No Personal Spaces available.
                </p>
              )
            ) : businessSpaces.length > 0 ? (
              businessSpaces.map((space) => (
                <Link
                  to={'/business/' + space.id}
                  className="home-space-picker-row-v116"
                  key={space.id}
                  onClick={() =>
                    setHomeSpacePicker(null)
                  }
                >
                  <SpaceAvatar space={space} />
                  <span>
                    <strong>{space.name}</strong>
                    <small>Business</small>
                  </span>
                  <b aria-hidden="true">›</b>
                </Link>
              ))
            ) : (
              <p className="muted">
                No Business Spaces available.
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setHomeSpacePicker(null)
              }
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {showShortcutEditor && (
        <Modal
          title="Edit Home shortcuts"
          onClose={() =>
            setShowShortcutEditor(false)
          }
        >
          <div
            className="home-shortcut-editor-v116"
            data-home-shortcut-editor-v116
          >
            <p className="muted">
              Choose the six shortcuts shown on Personal Home.
              Your choices are saved on this device.
            </p>

            {homeShortcutDraft.map(
              (shortcutId, index) => (
                <label
                  className="home-shortcut-editor-row-v116"
                  key={'shortcut-slot-' + index}
                >
                  <span>
                    Slot {index + 1}
                  </span>

                  <select
                    value={shortcutId}
                    onChange={(event) =>
                      setHomeShortcutDraft(
                        (current) =>
                          current.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? event.target.value as HomeShortcutId
                                : item,
                          ),
                      )
                    }
                  >
                    {homeShortcutChoices.map(
                      (choice) => (
                        <option
                          value={choice.id}
                          key={choice.id}
                          disabled={
                            homeShortcutDraft.some(
                              (
                                selected,
                                selectedIndex,
                              ) =>
                                selectedIndex
                                  !== index
                                && selected
                                  === choice.id,
                            )
                          }
                        >
                          {choice.label}
                          {' · '}
                          {choice.description}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ),
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button ghost"
              onClick={resetShortcutEditor}
            >
              Reset defaults
            </button>

            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setShowShortcutEditor(false)
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="button primary"
              onClick={saveShortcutEditor}
            >
              Save shortcuts
            </button>
          </div>
        </Modal>
      )}

      {showTripPicker && (
        <Modal
          title="Trips"
          onClose={() =>
            setShowTripPicker(false)
          }
        >
          <div
            className="home-space-picker-list-v116"
            data-trip-picker-list-v116
          >
            {personalTripSpaces.length > 0 ? (
              personalTripSpaces.map((trip) => (
                <Link
                  to={'/spaces/' + trip.id}
                  className="home-space-picker-row-v116"
                  key={trip.id}
                  onClick={() =>
                    setShowTripPicker(false)
                  }
                >
                  <SpaceAvatar space={trip} />
                  <span>
                    <strong>{trip.name}</strong>
                    <small>Trip</small>
                  </span>
                  <b aria-hidden="true">›</b>
                </Link>
              ))
            ) : (
              <p className="muted">
                No active trips yet.
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setShowTripPicker(false)
              }
            >
              Close
            </button>
          </div>
        </Modal>
      )}


    </main>
  );
}
