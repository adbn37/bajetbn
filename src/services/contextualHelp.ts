export const CONTEXTUAL_HELP_REPLAY_EVENT =
  'bajetbn:contextual-help-replay';

const STORAGE_PREFIX = 'bajetbn:contextual-help:v1:';

export interface ContextualHelpTip {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionPath?: string;
}

const TIPS: ContextualHelpTip[] = [
  {
    id: 'home',
    eyebrow: 'Welcome to BajetBN',
    title: 'Your money starts here',
    body:
      'See your balances, recent money activity, accounts and the shortcuts you use most. Use the + button below whenever you want to record income or an expense.',
  },
  {
    id: 'spaces',
    eyebrow: 'Spaces',
    title: 'Keep shared money organised',
    body:
      'Spaces separate different parts of your life. Use them for your household, trips, SME, collections and other shared plans.',
    actionLabel: 'View Spaces',
    actionPath: '/spaces',
  },
  {
    id: 'space-details',
    eyebrow: 'Inside a Space',
    title: 'Everything for this Space lives here',
    body:
      'Use the Space shortcuts to manage its money, tasks, members and activity without mixing it with unrelated records.',
  },
  {
    id: 'pos',
    eyebrow: 'SME POS',
    title: 'Record sales from this register',
    body:
      'Use POS for sales, stock and checkout activity linked to this SME. Seller and inventory records stay connected to the same Space.',
  },
  {
    id: 'accounts',
    eyebrow: 'Accounts',
    title: 'Your real money locations',
    body:
      'Add bank, cash, card and e-wallet accounts here. Account balances help BajetBN show where your money actually sits.',
  },
  {
    id: 'activity',
    eyebrow: 'Money activity',
    title: 'Your income and expenses',
    body:
      'This is the detailed history behind your balances. Filter records, open receipts and review where money came from or went.',
  },
  {
    id: 'budgets',
    eyebrow: 'Budgets',
    title: 'Set a limit before you spend',
    body:
      'Budgets help you plan how much you want to spend. Keep categories consistent so your reports remain useful.',
  },
  {
    id: 'bills',
    eyebrow: 'Bills & instalments',
    title: 'Know what needs paying',
    body:
      'Track recurring bills and instalment commitments here so due dates and remaining amounts do not get lost.',
  },
  {
    id: 'debt',
    eyebrow: 'Debt',
    title: 'Track money owed clearly',
    body:
      'Use Debt for money you owe or money other people owe you. Keep repayments linked so the remaining balance stays clear.',
  },
  {
    id: 'goals',
    eyebrow: 'Goals',
    title: 'Save towards something',
    body:
      'Create savings goals, set targets and update progress as you put money aside.',
  },
  {
    id: 'recurring',
    eyebrow: 'Recurring money',
    title: 'Automate repeat records',
    body:
      'Use recurring money for regular income or expenses that repeat on a schedule.',
  },
  {
    id: 'reports',
    eyebrow: 'Reports',
    title: 'Understand your money',
    body:
      'Switch between Week, Month, Quarter and Year. Use filters when you want to focus on one Space, account or category.',
  },
  {
    id: 'calendar',
    eyebrow: 'Calendar',
    title: 'See money dates together',
    body:
      'Calendar brings upcoming bills, instalments and other dated money items into one timeline.',
  },
  {
    id: 'inbox',
    eyebrow: 'Needs Attention',
    title: 'Actions waiting for you',
    body:
      'This page collects approvals, requests and other items that need action without creating duplicate financial records.',
  },
  {
    id: 'notifications',
    eyebrow: 'Alerts',
    title: 'Updates and reminders',
    body:
      'Review reminders and collaboration updates here. The unread badge disappears as you catch up.',
  },
  {
    id: 'search',
    eyebrow: 'Search',
    title: 'Find a record quickly',
    body:
      'Search across BajetBN when you know what you need but not where it lives.',
  },
  {
    id: 'offline-sync',
    eyebrow: 'Offline & Sync',
    title: 'Check pending changes',
    body:
      'Use this page when you recorded something with a weak connection or want to confirm that saved changes have synced.',
  },
  {
    id: 'more',
    eyebrow: 'More',
    title: 'Everything else is here',
    body:
      'More keeps less-frequent tools out of your main navigation. You can also replay these tips here whenever you need them.',
  },
  {
    id: 'subscription',
    eyebrow: 'Your plan',
    title: 'Manage BajetBN access',
    body:
      'See your current plan and Plus access here. Your existing records are kept even if your plan changes.',
  },
  {
    id: 'settings',
    eyebrow: 'Settings',
    title: 'Make BajetBN yours',
    body:
      'Adjust your profile, language, appearance, reminders, privacy and other personal preferences here.',
  },
];

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}${uid}`;
}

export function contextualHelpTipForPath(
  pathname: string,
): ContextualHelpTip | null {
  if (pathname === '/') {
    return TIPS.find((tip) => tip.id === 'home') || null;
  }

  if (/^\/spaces\/[^/]+\/pos(?:\/|$)/.test(pathname)) {
    return TIPS.find((tip) => tip.id === 'pos') || null;
  }

  if (/^\/spaces\/[^/]+(?:\/|$)/.test(pathname)) {
    return TIPS.find((tip) => tip.id === 'space-details') || null;
  }

  const routeMap: Array<[string, string]> = [
    ['/spaces', 'spaces'],
    ['/accounts', 'accounts'],
    ['/transactions', 'activity'],
    ['/budgets', 'budgets'],
    ['/bills', 'bills'],
    ['/debt', 'debt'],
    ['/goals', 'goals'],
    ['/recurring', 'recurring'],
    ['/reports', 'reports'],
    ['/calendar', 'calendar'],
    ['/inbox', 'inbox'],
    ['/notifications', 'notifications'],
    ['/search', 'search'],
    ['/offline-sync', 'offline-sync'],
    ['/more', 'more'],
    ['/subscription', 'subscription'],
    ['/settings', 'settings'],
  ];

  const match = routeMap.find(([route]) => (
    pathname === route || pathname.startsWith(`${route}/`)
  ));

  if (!match) {
    return null;
  }

  return TIPS.find((tip) => tip.id === match[1]) || null;
}

export function hasSeenContextualHelp(
  uid: string,
  tipId: string,
) {
  if (!uid || typeof window === 'undefined') {
    return true;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    const seen = raw ? JSON.parse(raw) as string[] : [];
    return seen.includes(tipId);
  } catch {
    return false;
  }
}

export function markContextualHelpSeen(
  uid: string,
  tipId: string,
) {
  if (!uid || typeof window === 'undefined') {
    return;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    const seen = new Set<string>(
      raw ? JSON.parse(raw) as string[] : [],
    );

    seen.add(tipId);

    window.localStorage.setItem(
      storageKey(uid),
      JSON.stringify([...seen]),
    );
  } catch {
    // Guidance remains usable for the current session.
  }
}

export function resetContextualHelp(uid: string) {
  if (!uid || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey(uid));
  } catch {
    // Replay still emits so the current page can show guidance.
  }

  window.dispatchEvent(
    new CustomEvent(CONTEXTUAL_HELP_REPLAY_EVENT),
  );
}
