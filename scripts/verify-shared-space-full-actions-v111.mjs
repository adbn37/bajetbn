import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const accounts =
  read('src/features/accounts/AccountsPage.tsx');

const budgets =
  read('src/features/budgets/BudgetsPage.tsx');

const goals =
  read('src/features/goals/GoalsPage.tsx');

const commitments =
  read('src/features/commitments/CommitmentsPage.tsx');

const trip =
  read('src/features/spaces/TripPlanningPanel.tsx');

const work =
  read('src/features/spaces/SpaceWorkPanel.tsx');

const fund =
  read('src/features/spaces/SpaceFundPanel.tsx');

const shared =
  read('src/features/spaces/SharedExpensesPanel.tsx');

const smeOperations =
  read('src/features/spaces/SmeOperationsCommandCentre.tsx');

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

/*
 * Reusable pages should have only the scoped effect.
 */

for (const [name, source] of [
  ['Accounts', accounts],
  ['Budget', budgets],
  ['Goals', goals],
  ['Bills', commitments],
]) {
  check(
    !source.includes(
      'useEffect(() => { void load(); }, [user]);',
    ),
    name + ' does not duplicate its scoped data load.',
  );
}

/*
 * Household.
 */

check(
  hub.includes('label="Household Fund"')
    && hub.includes("setTool('fund')")
    && fund.includes(
      'recordSpaceFundContribution',
    ),
  'Household Fund is functional.',
);

check(
  hub.includes('label="Add Expense"')
    && hub.includes(
      "openMoney('expense')",
    )
    && hub.includes(
      'MoneyActivityModal',
    ),
  'Household Add Expense is functional.',
);

check(
  hub.includes('label="To-Do"')
    && work.includes(
      'saveSpaceWorkItem',
    )
    && work.includes(
      'setSpaceWorkItemStatus',
    ),
  'Household To-Do is functional.',
);

check(
  hub.includes('label="To-Buy"')
    && work.includes(
      'markSpaceWorkItemBought',
    )
    && work.includes(
      'recordSpaceWorkPurchaseExpense',
    ),
  'Household To-Buy is functional.',
);

check(
  details.includes(
    'usesFullBudgetModule',
  )
    && budgets.includes(
      "'Household Space'",
    )
    && budgets.includes(
      'createBudget',
    )
    && budgets.includes(
      'updateBudget',
    )
    && budgets.includes(
      'manageBudget',
    ),
  'Household Budget uses full Budget CRUD.',
);

check(
  hub.includes(
    'label="Shared Expenses"',
  )
    && shared.includes(
      'SharedExpensesPanel',
    ),
  'Household Shared Expenses remains functional.',
);

check(
  hub.includes(
    'label="Shared Bills"',
  )
    && hub.includes(
      "setTool('bills')",
    ),
  'Household Shared Bills remains functional.',
);

check(
  hub.includes(
    'label="Settlements"',
  )
    && hub.includes(
      "setTool('balances')",
    ),
  'Household Settlements remains functional.',
);

/*
 * Trip.
 */

check(
  hub.includes(
    'label="Trip Plan"',
  )
    && hub.includes(
      'TripPlanningPanel',
    )
    && trip.includes(
      'saveTripItineraryItem',
    )
    && trip.includes(
      'saveTripTask',
    )
    && trip.includes(
      'saveTripBooking',
    ),
  'Trip Plan is functional.',
);

check(
  hub.includes(
    'label="Trip Fund"',
  )
    && fund.includes(
      'recordSpaceFundContribution',
    ),
  'Trip Fund is functional.',
);

check(
  hub.includes(
    'label="Trip Expenses"',
  )
    && hub.includes(
      'SharedExpensesPanel',
    ),
  'Trip Expenses is functional.',
);

check(
  hub.includes(
    'label="Settle Up"',
  )
    && hub.includes(
      'view="balances"',
    ),
  'Trip Settle Up is functional.',
);

check(
  details.includes(
    'usesFullBudgetModule',
  )
    && budgets.includes(
      "'Trip Space'",
    ),
  'Trip Budget uses full Budget CRUD.',
);

/*
 * SME.
 */

check(
  hub.includes(
    'label="Tasks"',
  )
    && hub.includes(
      "setTool('tasks')",
    )
    && work.includes(
      'saveSpaceWorkItem',
    ),
  'SME Tasks is functional.',
);

check(
  hub.includes(
    'label="Purchase List"',
  )
    && work.includes(
      'recordSpaceWorkPurchaseExpense',
    ),
  'SME Purchase List is functional.',
);

check(
  hub.includes(
    'label="Business Accounts"',
  )
    && hub.includes(
      'to="/accounts"',
    ),
  'SME Business Accounts opens full account management.',
);

check(
  smeOperations.includes(
    '?section=bills',
  )
    && !smeOperations.includes(
      '?tab=bills',
    ),
  'SME Needs Attention opens Business Bills & Instalments.',
);

check(
  details.includes(
    'Loading Business Bills & Instalments',
  )
    && commitments.includes(
      'payCommitment',
    )
    && commitments.includes(
      'updateCommitment',
    )
    && commitments.includes(
      'manageCommitment',
    ),
  'SME owner Bills & Instalments is fully functional.',
);

check(
  hub.includes(
    '/pos',
  )
    && hub.includes(
      'smePosLabel',
    ),
  'Existing SME POS route remains preserved.',
);

/*
 * Existing Personal modules remain.
 */

check(
  details.includes(
    'EmbeddedAccountsPage',
  )
    && details.includes(
      'Add Income',
    )
    && details.includes(
      'Add Expense',
    )
    && details.includes(
      'EmbeddedGoalsPage',
    ),
  'Personal full modules remain preserved.',
);

/*
 * Locked mobile navigation.
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

const navTokens = [
  'Business',
  '<small>Home</small>',
  'mobile-bottom-add',
  '<small>Alerts</small>',
  '<small>More</small>',
];

let previous = -1;
let navigationValid = true;

for (const token of navTokens) {
  const index =
    nav.indexOf(token);

  if (
    index < 0
    || index <= previous
  ) {
    navigationValid = false;
    break;
  }

  previous = index;
}

check(
  navigationValid,
  'Business | Home | + | Alerts | More remains locked.',
);

if (failures.length) {
  console.error('');

  failures.forEach(
    (failure) =>
      console.error('- ' + failure),
  );

  throw new Error(
    'Shared Space action verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  'Household, Trip and SME visible-action verification PASS.',
);
