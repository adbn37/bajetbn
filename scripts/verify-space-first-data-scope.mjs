import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
    return;
  }

  console.error('FAIL:', message);
  process.exitCode = 1;
}

const spacePage =
  await read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const actionHub =
  await read(
    'src/features/spaces/SpaceActionHub.tsx',
  );

const accountRepo =
  await read(
    'src/repositories/accountRepository.ts',
  );

const transactionRepo =
  await read(
    'src/repositories/transactionRepository.ts',
  );

const budgetRepo =
  await read(
    'src/repositories/budgetRepository.ts',
  );

const goalRepo =
  await read(
    'src/repositories/goalRepository.ts',
  );

const commitmentRepo =
  await read(
    'src/repositories/commitmentRepository.ts',
  );

check(
  !spacePage.includes(
    'listTransactions(user.uid)',
  ),
  'SpaceDetails does not fetch every user transaction.',
);

check(
  !spacePage.includes(
    'listBudgets(user.uid)',
  ),
  'SpaceDetails does not fetch every user budget.',
);

check(
  !spacePage.includes(
    'listCommitments(user.uid)',
  ),
  'SpaceDetails does not fetch every user commitment.',
);

check(
  !spacePage.includes(
    'listGoals(user.uid)',
  ),
  'SpaceDetails does not fetch every user goal.',
);

check(
  !spacePage.includes(
    'listAccounts(user.uid)',
  ),
  'SpaceDetails does not fetch every user account.',
);

check(
  spacePage.includes(
    'listTransactionsForOwnerSpace',
  ),
  'Transaction queries are Space-scoped.',
);

check(
  spacePage.includes(
    'listBudgetsForOwnerSpace',
  ),
  'Budget queries are Space-scoped.',
);

check(
  spacePage.includes(
    'listCommitmentsForOwnerSpace',
  ),
  'Commitment queries are Space-scoped.',
);

check(
  spacePage.includes(
    'listGoalsForOwnerSpace',
  ),
  'Goal queries are Space-scoped.',
);

check(
  spacePage.includes(
    'listAccountsForOwnerSpace',
  ),
  'Account queries are Space-scoped.',
);

check(
  spacePage.includes(
    "searchParams.get('details') === '1'",
  ),
  'Detailed overview has explicit request state.',
);

check(
  spacePage.includes(
    '!nextCompactActionHome',
  ),
  'Compact Space homes use lightweight runtime path.',
);

check(
  spacePage.includes(
    'detailedOverviewRequested && (',
  ),
  'Hidden detailed command centres are unmounted.',
);

check(
  !actionHub.includes(
    'useEffect(() => {\n    void loadMoneyOptions();',
  ),
  'Money form data is not loaded on Space home mount.',
);

check(
  actionHub.includes(
    "void openMoney('expense')",
  ),
  'Expense options load when requested.',
);

check(
  accountRepo.includes(
    'listAccountsForOwnerSpace',
  ),
  'Account Space primitive exists.',
);

check(
  transactionRepo.includes(
    'listTransactionsForOwnerSpace',
  ),
  'Transaction Space primitive exists.',
);

check(
  budgetRepo.includes(
    'listBudgetsForOwnerSpace',
  ),
  'Budget Space primitive exists.',
);

check(
  goalRepo.includes(
    'listGoalsForOwnerSpace',
  ),
  'Goal Space primitive exists.',
);

check(
  commitmentRepo.includes(
    'listCommitmentsForOwnerSpace',
  ),
  'Commitment Space primitive exists.',
);

if (process.exitCode) {
  throw new Error(
    'Space-first data-scope verification failed.',
  );
}

console.log(
  '\nSpace-first data-scope verification PASS.',
);
