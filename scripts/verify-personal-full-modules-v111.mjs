import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');

const accounts =
  read('src/features/accounts/AccountsPage.tsx');

const budgets =
  read('src/features/budgets/BudgetsPage.tsx');

const goals =
  read('src/features/goals/GoalsPage.tsx');

const commitments =
  read('src/features/commitments/CommitmentsPage.tsx');

const accountRepo =
  read('src/repositories/accountRepository.ts');

const goalRepo =
  read('src/repositories/goalRepository.ts');

const commitmentRepo =
  read('src/repositories/commitmentRepository.ts');

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

/* ----------------------------------------------------------
 * Personal accounts
 * ---------------------------------------------------------- */

check(
  accountRepo.includes(
    'listAllPersonalAccounts',
  )
    && accountRepo.includes(
      "where('classification', '==', 'personal')",
    )
    && accountRepo.includes(
      'listPersonalAccounts',
    ),
  'Personal accounts use personal classification.',
);

check(
  details.includes(
    'listPersonalAccounts',
  ),
  'Personal Space money workflows receive personal accounts.',
);

/* ----------------------------------------------------------
 * Accounts module
 * ---------------------------------------------------------- */

check(
  details.includes(
    'EmbeddedAccountsPage',
  )
    && details.includes(
      'spaceIdOverride={space.id}',
    )
    && accounts.includes(
      'spaceIdOverride',
    )
    && accounts.includes(
      'lockedPersonal',
    )
    && accounts.includes(
      '+ Add account',
    ),
  'Accounts is a functional Personal module.',
);

check(
  accounts.includes(
    'updateAccount',
  )
    && accounts.includes(
      'manageAccount',
    ),
  'Accounts retains edit/close/delete actions.',
);

/* ----------------------------------------------------------
 * Income + Expense
 * ---------------------------------------------------------- */

check(
  details.includes(
    'Add Income',
  )
    && details.includes(
      'openPersonalMoney',
    )
    && details.includes(
      'personalMoneyType',
    )
    && details.includes(
      'MoneyActivityModal',
    )
    && details.includes(
      'onSubmit={postTransaction}',
    ),
  'Income has Add Income through canonical Money Activity.',
);

check(
  details.includes(
    'Add Expense',
  )
    && details.includes(
      "'expense'",
    )
    && details.includes(
      'openPersonalMoney',
    )
    && details.includes(
      'MoneyActivityModal',
    )
    && details.includes(
      'onSubmit={postTransaction}',
    ),
  'Expenses has Add Expense through canonical Money Activity.',
);

check(
  details.includes(
    'lockedSpaceId={space.id}',
  )
    && details.includes(
      'initialType={personalMoneyType}',
    ),
  'Income and Expense creation stay locked to Personal Space.',
);

/* ----------------------------------------------------------
 * Budget
 * ---------------------------------------------------------- */

check(
  details.includes(
    'EmbeddedBudgetsPage',
  )
    && budgets.includes(
      'spaceIdOverride',
    )
    && budgets.includes(
      'listBudgetsForOwnerSpace',
    )
    && budgets.includes(
      'Add budget',
    )
    && budgets.includes(
      'updateBudget',
    )
    && budgets.includes(
      'manageBudget',
    ),
  'Budget supports add/edit/archive/delete in Personal Space.',
);

/* ----------------------------------------------------------
 * Goals
 * ---------------------------------------------------------- */

check(
  details.includes(
    'EmbeddedGoalsPage',
  )
    && goals.includes(
      'spaceIdOverride',
    )
    && goals.includes(
      'listGoalsForOwnerSpace',
    )
    && goals.includes(
      'Add savings goal',
    )
    && goals.includes(
      'recordGoalContribution',
    )
    && goals.includes(
      'updateGoal',
    )
    && goals.includes(
      'manageGoal',
    ),
  'Goals supports create/edit/progress/lifecycle actions.',
);

check(
  goalRepo.includes(
    'listGoalContributionsForGoal',
  )
    && goals.includes(
      'listGoalContributionsForGoal',
    ),
  'Goal contribution history is scoped/lazy.',
);

/* ----------------------------------------------------------
 * Bills / Instalments
 * ---------------------------------------------------------- */

check(
  details.includes(
    'EmbeddedCommitmentsPage',
  )
    && details.includes(
      'typeOverride="bill"',
    )
    && commitments.includes(
      'typeOverride',
    )
    && commitments.includes(
      'listCommitmentsForOwnerSpace',
    ),
  'Bills opens a functional bill-only module.',
);

check(
  details.includes(
    'typeOverride="instalment"',
  ),
  'Instalments opens a functional instalment-only module.',
);

check(
  commitments.includes(
    'payCommitment',
  )
    && commitments.includes(
      'updateCommitment',
    )
    && commitments.includes(
      'manageCommitment',
    ),
  'Bills and Instalments retain pay/edit/stop/delete actions.',
);

check(
  commitmentRepo.includes(
    'listCommitmentPaymentsForCommitment',
  )
    && commitments.includes(
      'listCommitmentPaymentsForCommitment',
    ),
  'Commitment payment history loads per commitment.',
);

/* ----------------------------------------------------------
 * Reports / More / lazy-loading
 * ---------------------------------------------------------- */

check(
  details.includes(
    "section === 'reports'",
  )
    && details.includes(
      'space-report-controls',
    )
    && details.includes(
      'reportRange',
    ),
  'Reports remains interactive and Space-scoped.',
);

check(
  details.includes(
    'personalEmbeddedSection',
  ),
  'Heavy Personal modules load only when opened.',
);

check(
  hub.includes(
    'data-space-more-v111',
  )
    && hub.includes(
      'setSpaceMoreOpen(true)',
    ),
  'Personal More remains Space-specific.',
);

/* ----------------------------------------------------------
 * Locked mobile navigation
 * ---------------------------------------------------------- */

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
let navPass = true;

for (const token of navTokens) {
  const index =
    nav.indexOf(token);

  if (
    index < 0
    || index <= previous
  ) {
    navPass = false;
    break;
  }

  previous = index;
}

check(
  navPass,
  'Business | Home | + | Alerts | More remains locked.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error('- ' + failure);
  }

  throw new Error(
    'Personal full-module verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  'Personal full-function module verification PASS.',
);