import fs from 'node:fs';

const read =
  (file) => fs.readFileSync(file, 'utf8');

const dashboard =
  read('src/pages/DashboardPage.tsx');

const shell =
  read('src/layouts/AppShell.tsx');

const transactions =
  read('src/repositories/transactionRepository.ts');

const css =
  read('src/styles/global.css');

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
  } else {
    failures.push(message);
    console.error('FAIL:', message);
  }
}

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
    && dashboard.includes(
      'Money in',
    )
    && dashboard.includes(
      'Money out',
    ),
  'Monthly Money in/out is preserved.',
);

check(
  /const\s+recentTransactions\s*=[\s\S]{0,400}?transactions\s*\.slice\s*\(\s*0\s*,\s*20\s*,?\s*\)/m.test(
    dashboard,
  ),
  'Visible account activity is limited to latest 20.',
);

check(
  dashboard.includes(
    'recentTransactions.map(',
  ),
  'Home renders latest account activity.',
);

check(
  dashboard.includes(
    'loadQuickOptions',
  )
    && dashboard.includes(
      "item.type === 'personal'",
    ),
  'Global Add defaults to the internal personal budget scope.',
);

const start =
  shell.indexOf(
    '<nav className="mobile-bottom-nav"',
  );

const end =
  shell.indexOf(
    '</nav>',
    start,
  );

const nav =
  start >= 0 && end > start
    ? shell.slice(start, end)
    : '';

const tokens = [
  '<small>Home</small>',
  '<small>Money</small>',
  'mobile-bottom-add',
  '<small>Spaces</small>',
  '<small>More</small>',
];

let last = -1;
let ordered = true;

for (const token of tokens) {
  const index =
    nav.indexOf(token);

  if (
    index < 0
    || index <= last
  ) {
    ordered = false;
    break;
  }

  last = index;
}

check(
  ordered,
  'Mobile navigation is Home | Money | + | Spaces | More.',
);

check(
  nav.includes(
    'to="/transactions"',
  ),
  'Money is a direct mobile destination.',
);

check(
  nav.includes(
    "navigate('/?quick=1')",
  ),
  'Centre + opens global money activity.',
);

check(
  nav.includes(
    'to="/spaces"',
  )
    && nav.includes(
      '<small>Spaces</small>',
    ),
  'Spaces is a shared-work destination.',
);

check(
  nav.includes(
    'to="/more"',
  ),
  'More remains the fifth destination.',
);

check(
  css.includes(
    'v1.11.0 FIVE-SLOT MOBILE NAV LOCK',
  ),
  'Five-slot mobile navigation layout remains present.',
);

if (failures.length) {
  throw new Error(
    'Global Home/navigation verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log(
  'Global Home/navigation verification PASS.',
);
