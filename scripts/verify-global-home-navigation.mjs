import fs from 'node:fs';

const read =
  (file) =>
    fs.readFileSync(
      file,
      'utf8',
    );

const dashboard =
  read(
    'src/pages/DashboardPage.tsx',
  );

const shell =
  read(
    'src/layouts/AppShell.tsx',
  );

const transactions =
  read(
    'src/repositories/transactionRepository.ts',
  );

const css =
  read(
    'src/styles/global.css',
  );

const failures = [];

function check(
  condition,
  message,
) {
  if (condition) {
    console.log(
      'PASS:',
      message,
    );

    return;
  }

  failures.push(message);

  console.error(
    'FAIL:',
    message,
  );
}

/*
 * ------------------------------------------------------------
 * HOME DATA SCOPE
 * ------------------------------------------------------------
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
      "where('ownerId', '==', uid)",
    )
    && transactions.includes(
      "where('accountId', '==', accountId)",
    ),
  'Account-scoped transaction repository reader exists.',
);

check(
  transactions.includes(
    "where('destinationAccountId', '==', accountId)",
  ),
  'Destination-side transfers are included in account activity.',
);

/*
 * ------------------------------------------------------------
 * MONTHLY ACCOUNT SUMMARY
 * ------------------------------------------------------------
 */

check(
  dashboard.includes(
    'function accountMonthSummary(',
  ),
  'Per-account monthly money summary is preserved.',
);

check(
  dashboard.includes(
    'Money in',
  )
    && dashboard.includes(
      'Money out',
    )
    && dashboard.includes(
      'This month',
    ),
  'Selected account card retains monthly Money in/out.',
);

/*
 * ------------------------------------------------------------
 * LATEST 20 DISPLAY
 *
 * Do not depend on formatting such as:
 *   .slice(0, 20)
 *
 * Accept multiline:
 *   transactions.slice(
 *     0,
 *     20,
 *   )
 * ------------------------------------------------------------
 */

check(
  /transactions\s*\.slice\s*\(\s*0\s*,\s*20\s*,?\s*\)/m.test(
    dashboard,
  ),
  'Home limits the visible account activity to the latest 20 entries.',
);

check(
  /const\s+recentTransactions\s*=/m.test(
    dashboard,
  )
    && dashboard.includes(
      'recentTransactions.map(',
    ),
  'The Home activity list renders the latest-20 view.',
);

/*
 * The account query itself must NOT be reduced to 20 before
 * accountMonthSummary runs, otherwise monthly totals would be
 * incomplete.
 */
check(
  !/setTransactions\s*\([\s\S]{0,500}?\.slice\s*\(\s*0\s*,\s*20/m.test(
    dashboard,
  ),
  'Monthly summary keeps the full selected-account scoped result.',
);

/*
 * ------------------------------------------------------------
 * LAZY GLOBAL ADD
 * ------------------------------------------------------------
 */

check(
  dashboard.includes(
    'loadQuickOptions',
  ),
  'Add options use a lazy loader.',
);

check(
  dashboard.includes(
    'listSpaces(user.uid)',
  )
    && dashboard.includes(
      'listAllCustomCategories',
    ),
  'Spaces and categories remain available to global Add.',
);

/*
 * ------------------------------------------------------------
 * ACCOUNT CAROUSEL
 * ------------------------------------------------------------
 */

check(
  dashboard.includes(
    'home-v110-account-carousel',
  )
    && dashboard.includes(
      'home-v110-account-slide',
    )
    && dashboard.includes(
      'home-v110-carousel-dots',
    ),
  'Account carousel remains intact.',
);

check(
  dashboard.includes(
    'setPreferredHomeAccountId',
  ),
  'Selected Home account preference remains persistent.',
);

/*
 * ------------------------------------------------------------
 * MOBILE NAVIGATION
 * ------------------------------------------------------------
 */

const navClassIndex =
  shell.indexOf(
    'className="mobile-bottom-nav',
  );

let mobileNavigation = '';

if (navClassIndex >= 0) {
  const start =
    shell.lastIndexOf(
      '<nav',
      navClassIndex,
    );

  const end =
    shell.indexOf(
      '</nav>',
      navClassIndex,
    );

  if (
    start >= 0
    && end > start
  ) {
    mobileNavigation =
      shell.slice(
        start,
        end + '</nav>'.length,
      );
  }
}

check(
  Boolean(
    mobileNavigation,
  ),
  'Mobile navigation is installed.',
);

const homeIndex =
  mobileNavigation.indexOf(
    '<small>Home</small>',
  );

const spacesIndex =
  mobileNavigation.indexOf(
    '<small>Spaces</small>',
  );

const addIndex =
  mobileNavigation.indexOf(
    'mobile-bottom-add',
  );

const moreIndex =
  mobileNavigation.indexOf(
    '<small>More</small>',
  );

check(
  homeIndex >= 0
    && spacesIndex > homeIndex
    && addIndex > spacesIndex
    && moreIndex > addIndex,
  'Mobile navigation order is Home, Spaces, Add, More.',
);

check(
  mobileNavigation.includes(
    'to="/spaces"',
  ),
  'Spaces is a first-class mobile destination.',
);

check(
  mobileNavigation.includes(
    "navigate('/?quick=1')",
  ),
  'Global Add action is retained.',
);

check(
  mobileNavigation.includes(
    'to="/more"',
  ),
  'More is a first-class mobile destination.',
);

check(
  !mobileNavigation.includes(
    '<small>Business</small>',
  )
    && !shell.includes(
      'openBusinessShortcut',
    )
    && !shell.includes(
      'businessPickerOpen',
    ),
  'Old Business bottom-nav runtime is removed.',
);

check(
  !mobileNavigation.includes(
    '<small>Alerts</small>',
  )
    && !mobileNavigation.includes(
      'to="/notifications"',
    ),
  'Notifications no longer consume a bottom-nav destination.',
);

/*
 * ------------------------------------------------------------
 * RESPONSIVE NOTIFICATIONS
 * ------------------------------------------------------------
 */

check(
  shell.includes(
    "navigate('/notifications')",
  )
    && shell.includes(
      '<NotificationBellIcon />',
    ),
  'Notifications remain accessible from the responsive header.',
);

/*
 * ------------------------------------------------------------
 * CSS
 * ------------------------------------------------------------
 */

check(
  css.includes(
    'v1.11.0 Global Home + mobile navigation',
  ),
  'v1.11 Global Home/navigation styles are installed.',
);

check(
  /repeat\s*\(\s*4\s*,\s*minmax\s*\(\s*0\s*,\s*1fr\s*\)\s*\)/m.test(
    css,
  ),
  'Mobile navigation uses four equal slots.',
);

if (failures.length > 0) {
  console.error('');
  console.error(
    `${failures.length} Global Home/navigation check(s) failed:`,
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log('');
console.log(
  'Global Home/navigation verification PASS.',
);
console.log(
  'Account-first Home + monthly summary + latest-20 activity + Home/Spaces/Add/More verified.',
);