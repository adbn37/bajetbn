import fs from 'node:fs';

const page =
  fs.readFileSync(
    'src/features/spaces/SpaceDetailsPage.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const rules =
  fs.readFileSync(
    'firestore.rules',
    'utf8',
  );

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log('PASS: ' + label);
    return;
  }

  console.error('FAIL: ' + label);
  failures.push(label);
}

check(
  page.includes('function SpaceHomeOverview({')
    && page.includes('data-space-home-overview'),
  'Real Space Home overview component exists.',
);

check(
  page.includes('shouldLoadCompactHomeData')
    && page.includes('nextCompactActionHome')
    && page.includes('!nextCompactActionHome')
    && page.includes('homeTransactionsPromise')
    && page.includes('homeCommitmentsPromise'),
  'Compact Space homes use a separate lightweight runtime path.',
);

check(
  page.includes('listAccountsForOwnerSpace')
    && page.includes("nextSpace.ownerId === user.uid")
    && !page.includes('listAccountsForSpace('),
  'Business Space account balances stay owner-only on Space Home.',
);

check(
  page.includes("nextSpace.ownerId === user.uid")
    && page.includes('relatedAccountIds')
    && page.includes('visibleAccounts'),
  'Shared Household and Trip accounts stay owner-scoped and related-only.',
);

check(
  page.includes('This month')
    && page.includes('Money in')
    && page.includes('Money out')
    && page.includes('Net'),
  'Space Home contains a monthly money summary.',
);

const compactLoaderStart =
  page.indexOf(
    'if (\n        shouldLoadCompactHomeData',
  );

const heavyLoaderStart =
  page.indexOf(
    'if (\n        shouldLoadOverviewData',
    compactLoaderStart,
  );

const compactLoader =
  compactLoaderStart >= 0
    && heavyLoaderStart > compactLoaderStart
      ? page.slice(
          compactLoaderStart,
          heavyLoaderStart,
        )
      : '';

check(
  Boolean(compactLoader)
    && !compactLoader.includes(
      'listBudgetsForOwnerSpace',
    )
    && !compactLoader.includes(
      'listGoalsForOwnerSpace',
    )
    && !compactLoader.includes(
      'listSharedExpenses',
    )
    && !compactLoader.includes(
      'listSharedBillAssignments',
    ),
  'Space Home mount avoids heavy planning and shared-history datasets.',
);

check(
  page.includes('Accounts used in this Space')
    && page.includes('ledgerBalanceMinor'),
  'Space Home shows relevant accounts and balances.',
);

check(
  page.includes('Money activity')
    && /\.slice\(\s*0\s*,\s*5\s*\)/.test(page),
  'Space Home contains compact recent Money Activity.',
);

check(
  page.includes('Needs attention')
    && page.includes('openSharedItemCount')
    && page.includes('openCommitments'),
  'Space Home contains an attention section.',
);

check(
  page.includes('<SpaceActionHub'),
  'Existing Space quick actions remain available.',
);

check(
  css.includes('/* v1.14.7 Space Home overview */')
    && css.includes('.space-home-v1147-activity-row')
    && css.includes('@media (max-width: 640px)'),
  'Space Home has mobile-first responsive styling.',
);

check(
  !rules.includes('spaceHome'),
  'No new client Firestore access surface was added.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error('- ' + failure);
  }

  throw new Error(
    'Space Home verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  'SPACE HOME OVERVIEW VERIFICATION PASS',
);
