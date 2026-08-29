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
  'Personal uses the lightweight runtime path.',
);

check(
  hub.includes(
    'data-personal-home-v111',
  ),
  'Personal compact launcher exists.',
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
  'Personal launcher order remains correct.',
);

check(
  !personal.includes(
    'to="/more"',
  ),
  'Personal More does not open Global More.',
);

check(
  personal.includes(
    'setSpaceMoreOpen(true)',
  ),
  'Personal More opens Space More.',
);

check(
  hub.includes(
    'data-space-more-v111',
  )
    && hub.includes(
      'Global More remains in the bottom navigation.',
    ),
  'Space More is explicitly separate from Global More.',
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
    `Personal ${section} remains Space-contained.`,
  );
}

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
  'Personal data remains Space-scoped.',
);

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

const navTokens = [
  'Business',
  '<small>Home</small>',
  'mobile-bottom-add',
  '<small>Alerts</small>',
  '<small>More</small>',
];

let navPrevious = -1;
let navValid = true;

for (const token of navTokens) {
  const index =
    nav.indexOf(token);

  if (
    index < 0
    || index <= navPrevious
  ) {
    navValid = false;
    break;
  }

  navPrevious = index;
}

check(
  navValid,
  'Business | Home | + | Alerts | More stays locked.',
);

if (failures.length) {
  throw new Error(
    `Personal Space verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'Personal Space v1.11 verification PASS.',
);
