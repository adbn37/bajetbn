import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');

const shell =
  read('src/layouts/AppShell.tsx');

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
    return;
  }

  failures.push(message);
  console.error('FAIL:', message);
}

check(
  details.includes(
    "nextSpace.type === 'personal'",
  )
    && details.includes(
      '!nextCompactActionHome',
    ),
  'Personal overview uses the lightweight runtime path.',
);

check(
  details.includes(
    "['personal', 'sme', 'household', 'trip']",
  ),
  'Personal is a compact action home.',
);

check(
  hub.includes(
    'data-personal-home-v111',
  ),
  'Dedicated Personal launcher is installed.',
);

const personalStart =
  hub.indexOf(
    'data-personal-home-v111',
  );

const personalEnd =
  hub.indexOf(
    '\n        ) : (',
    personalStart,
  );

const personal =
  personalStart >= 0
    && personalEnd > personalStart
    ? hub.slice(
        personalStart,
        personalEnd,
      )
    : '';

const labels = [
  'Accounts',
  'Income',
  'Expenses',
  'Budget',
  'Goals',
  'Bills',
  'Instalments',
  'Reports',
  'More',
];

let previous = -1;
let ordered = true;

for (const label of labels) {
  const index =
    personal.indexOf(
      `label="${label}"`,
    );

  if (
    index < 0
    || index <= previous
  ) {
    ordered = false;
    break;
  }

  previous = index;
}

check(
  ordered,
  'Personal launcher order is Accounts, Income, Expenses, Budget, Goals, Bills, Instalments, Reports, More.',
);

for (const section of [
  'accounts',
  'income',
  'expenses',
  'budgets',
  'goals',
  'bills',
  'instalments',
  'reports',
]) {
  check(
    personal.includes(
      `?section=${section}`,
    ),
    `Personal ${section} opens inside the Personal Space.`,
  );
}

check(
  personal.includes(
    'to="/more"',
  ),
  'Personal More opens Global More.',
);

check(
  details.includes(
    'accounts={accounts}',
  )
    && details.includes(
      "section === 'accounts'",
    )
    && details.includes(
      'ledgerBalanceMinor',
    ),
  'Personal Accounts is Space-scoped and shows balances.',
);

check(
  details.includes(
    "section === 'income'",
  )
    && details.includes(
      "item.type === 'income'",
    ),
  'Personal Income has a Space-scoped view.',
);

check(
  details.includes(
    "section === 'expenses'",
  )
    && details.includes(
      "item.type === 'expense'",
    ),
  'Personal Expenses has a Space-scoped view.',
);

check(
  details.includes(
    'billsOnlyRows',
  )
    && details.includes(
      "item.type !== 'instalment'",
    ),
  'Personal Bills excludes instalments.',
);

check(
  details.includes(
    'instalmentRows',
  )
    && details.includes(
      "item.type === 'instalment'",
    )
    && details.includes(
      "section === 'instalments'",
    ),
  'Personal Instalments has its own Space-scoped view.',
);

check(
  details.includes(
    'listAccountsForOwnerSpace',
  )
    && details.includes(
      'listTransactionsForOwnerSpace',
    )
    && details.includes(
      'listBudgetsForOwnerSpace',
    )
    && details.includes(
      'listGoalsForOwnerSpace',
    )
    && details.includes(
      'listCommitmentsForOwnerSpace',
    ),
  'Personal financial data continues to use Space-scoped repository readers.',
);

check(
  details.includes(
    'closeOverviewSection',
  )
    && details.includes(
      "next.delete('section')",
    ),
  'Closing a Personal section clears its URL state.',
);

/*
 * Lock the already-approved global mobile nav.
 */
const navStart =
  shell.indexOf(
    '<nav className="mobile-bottom-nav"',
  );

const navEnd =
  shell.indexOf(
    '</nav>',
    navStart,
  );

const nav =
  navStart >= 0
    && navEnd > navStart
    ? shell.slice(
        navStart,
        navEnd,
      )
    : '';

const navOrder = [
  'Business',
  'Home',
  'mobile-bottom-add',
  'Alerts',
  'More',
];

let navPrevious = -1;
let navOrdered = true;

for (const token of navOrder) {
  const index =
    nav.indexOf(token);

  if (
    index < 0
    || index <= navPrevious
  ) {
    navOrdered = false;
    break;
  }

  navPrevious = index;
}

check(
  navOrdered,
  'Approved Business | Home | + | Alerts | More navigation remains locked.',
);

if (failures.length) {
  console.error('');
  console.error(
    `${failures.length} Personal Space check(s) failed.`,
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
  'Personal Space v1.11 verification PASS.',
);

console.log(
  'Accounts | Income | Expenses | Budget | Goals | Bills | Instalments | Reports | More',
);
