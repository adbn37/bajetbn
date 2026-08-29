import fs from 'node:fs';

const read =
  (file) =>
    fs.readFileSync(
      file,
      'utf8',
    );

const dashboard =
  read('src/pages/DashboardPage.tsx');

const shell =
  read('src/layouts/AppShell.tsx');

const transactions =
  read(
    'src/repositories/transactionRepository.ts',
  );

const css =
  read('src/styles/global.css');

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
    return;
  }

  failures.push(message);
  console.error('FAIL:', message);
}

/*
 * Global Home performance contract.
 */

check(
  !dashboard.includes(
    'listTransactions(user.uid)',
  ),
  'Home does not load all user transactions.',
);

check(
  !dashboard.includes(
    'listBudgets(user.uid)',
  ),
  'Home does not preload budgets.',
);

check(
  !dashboard.includes(
    'listGoals(user.uid)',
  ),
  'Home does not preload goals.',
);

check(
  !dashboard.includes(
    'listCommitments(user.uid)',
  ),
  'Home does not preload commitments.',
);

check(
  dashboard.includes(
    'listTransactionsForOwnerAccount',
  ),
  'Selected account controls Home activity.',
);

check(
  transactions.includes(
    'listTransactionsForOwnerAccount',
  )
    && transactions.includes(
      "where('accountId', '==', accountId)",
    ),
  'Account-scoped transaction reader exists.',
);

check(
  transactions.includes(
    "where('destinationAccountId', '==', accountId)",
  ),
  'Destination-side transfers are included.',
);

check(
  dashboard.includes(
    'function accountMonthSummary(',
  )
    && dashboard.includes('Money in')
    && dashboard.includes('Money out'),
  'Monthly Money in/out is preserved.',
);

check(
  /transactions\s*\.slice\s*\(\s*0\s*,\s*20\s*,?\s*\)/m.test(
    dashboard,
  ),
  'Visible account activity is limited to latest 20.',
);

check(
  dashboard.includes(
    'recentTransactions.map(',
  ),
  'Home renders the latest-20 activity view.',
);

check(
  dashboard.includes(
    'loadQuickOptions',
  ),
  'Global Add dependencies remain lazy-loaded.',
);

check(
  dashboard.includes(
    'home-v110-account-carousel',
  )
    && dashboard.includes(
      'setPreferredHomeAccountId',
    ),
  'Account carousel and preferred account remain intact.',
);

/*
 * Five-slot mobile navigation contract.
 */

const navMarker =
  shell.indexOf(
    '<nav className="mobile-bottom-nav"',
  );

const navEnd =
  shell.indexOf(
    '</nav>',
    navMarker,
  );

const mobileNavigation =
  navMarker >= 0
    && navEnd > navMarker
    ? shell.slice(
        navMarker,
        navEnd + '</nav>'.length,
      )
    : '';

check(
  Boolean(mobileNavigation),
  'Mobile bottom navigation exists.',
);

const businessIndex =
  mobileNavigation.indexOf(
    'businessPickerLoading',
  );

const homeIndex =
  mobileNavigation.indexOf(
    '<small>Home</small>',
  );

const addIndex =
  mobileNavigation.indexOf(
    'mobile-bottom-add',
  );

const alertsIndex =
  mobileNavigation.indexOf(
    '<small>Alerts</small>',
  );

const moreIndex =
  mobileNavigation.indexOf(
    '<small>More</small>',
  );

check(
  businessIndex >= 0
    && businessIndex < homeIndex
    && homeIndex < addIndex
    && addIndex < alertsIndex
    && alertsIndex < moreIndex,
  'Mobile navigation order is Business, Home, Add, Alerts, More.',
);

check(
  shell.includes(
    'openBusinessShortcut',
  )
    && shell.includes(
      "space.type === 'sme'",
    ),
  'Business shortcut targets Business/SME Spaces.',
);

check(
  shell.includes(
    'businessPickerOpen',
  )
    && shell.includes(
      'businessSpaces.map',
    ),
  'Multiple Business Spaces retain the Business picker.',
);

check(
  mobileNavigation.includes(
    "navigate('/?quick=1')",
  ),
  'Centre + opens global money activity.',
);

check(
  mobileNavigation.includes(
    'to="/notifications"',
  )
    && mobileNavigation.includes(
      '<NotificationBellIcon />',
    ),
  'Alerts is restored to mobile bottom navigation.',
);

check(
  mobileNavigation.includes(
    'unreadNotifications > 0',
  ),
  'Alerts retains the unread badge.',
);

check(
  mobileNavigation.includes(
    'to="/more"',
  ),
  'More remains the fifth mobile destination.',
);

/*
 * The + button must be precisely the third grid slot.
 */

check(
  css.includes(
    'v1.11.0 FIVE-SLOT MOBILE NAV LOCK',
  )
    && /repeat\s*\(\s*5\s*,\s*minmax\s*\(\s*0\s*,\s*1fr\s*\)\s*\)/m.test(
      css,
    )
    && /mobile-bottom-add[\s\S]{0,120}?grid-column:\s*3/m.test(
      css,
    ),
  '+ is locked to the exact centre slot (3 of 5).',
);

/*
 * Mobile Alerts means no duplicate notification action
 * in the mobile header. Desktop keeps its notification bell.
 */

const mobileHeaderStart =
  shell.indexOf(
    '<header className="mobile-header">',
  );

const mobileHeaderEnd =
  shell.indexOf(
    '</header>',
    mobileHeaderStart,
  );

const mobileHeader =
  shell.slice(
    mobileHeaderStart,
    mobileHeaderEnd,
  );

check(
  !mobileHeader.includes(
    "navigate('/notifications')",
  ),
  'Mobile notification access is not duplicated in the header.',
);

const desktopHeaderStart =
  shell.indexOf(
    '<div className="desktop-environment">',
  );

const desktopHeaderEnd =
  shell.indexOf(
    '<ConnectivityBanner />',
    desktopHeaderStart,
  );

const desktopHeader =
  shell.slice(
    desktopHeaderStart,
    desktopHeaderEnd,
  );

check(
  desktopHeader.includes(
    "navigate('/notifications')",
  )
    && desktopHeader.includes(
      '<NotificationBellIcon />',
    ),
  'Desktop notification bell remains available.',
);

if (failures.length) {
  console.error('');
  console.error(
    `${failures.length} Global Home/navigation check(s) failed:`,
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log('');
console.log(
  'Global Home/navigation verification PASS.',
);

console.log(
  'Mobile navigation: Business | Home | + | Alerts | More.',
);

console.log(
  '+ is the exact centre item: slot 3 of 5.',
);