import fs from 'node:fs';

const page =
  fs.readFileSync(
    'src/features/spaces/SpaceDetailsPage.tsx',
    'utf8',
  );

const hub =
  fs.readFileSync(
    'src/features/spaces/SpaceActionHub.tsx',
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
  'Space Home shows relevant owner accounts and balances.',
);

check(
  page.includes(
    "space.type === 'personal'\n            || space.ownerId === user?.uid",
  )
    && page.includes(
      "nextSpace.type === 'personal'\n              || nextSpace.ownerId === user.uid",
    )
    && page.includes(
      ': Promise.resolve([] as Account[]);',
    ),
  'Shared Space account cards and account loading are owner-only.',
);

check(
  page.includes(
    'Shared Spaces never inherit account visibility',
  )
    && page.includes(
      'merely\n         * because a transaction uses that account',
    ),
  'Space account usage never implies account sharing.',
);

check(
  page.includes('Account balance')
    && page.includes(
      'space-home-v1147-account-balance',
    )
    && page.includes(
      'not the Space fund balance',
    ),
  'Account card distinguishes Account balance from Space fund balance.',
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

const actionHubPosition =
  page.indexOf('<SpaceActionHub');

const homeOverviewPosition =
  page.indexOf('<SpaceHomeOverview');

check(
  actionHubPosition >= 0
    && homeOverviewPosition >= 0
    && actionHubPosition < homeOverviewPosition,
  'Space navigation appears above Space Home dashboard content.',
);

check(
  css.includes('/* v1.14.7 Space navigation rail */')
    && css.includes('.simplified-space-actions')
    && css.includes('overflow-x: auto')
    && css.includes('flex: 0 0 auto'),
  'Space navigation is a horizontal scrollable rail.',
);

const householdStart =
  hub.indexOf(
    "{space.type === 'household' && <>",
  );

const householdEnd =
  hub.indexOf(
    '</>}',
    householdStart,
  );

const householdBlock =
  householdStart >= 0
    && householdEnd > householdStart
      ? hub.slice(
          householdStart,
          householdEnd,
        )
      : '';

const householdLabels = [
  'label="Home"',
  'label="Fund"',
  'label="Bills"',
  'label="Expenses"',
  'label="To-Do"',
  'label="Shopping"',
  'label="More"',
];

let previousHouseholdLabel = -1;

const householdOrderCorrect =
  householdLabels.every(
    (label) => {
      const position =
        householdBlock.indexOf(label);

      const valid =
        position > previousHouseholdLabel;

      previousHouseholdLabel =
        position;

      return valid;
    },
  );

check(
  Boolean(householdBlock)
    && householdOrderCorrect,
  'Household navigation order is Home, Fund, Bills, Expenses, To-Do, Shopping, More.',
);

check(
  hub.includes(
    'const householdNavigationTarget',
  )
    && hub.includes(
      "householdNavigationTarget === 'home'",
    )
    && hub.includes(
      "householdNavigationTarget === 'fund'",
    )
    && hub.includes(
      "householdNavigationTarget === 'bills'",
    )
    && hub.includes(
      "householdNavigationTarget === 'expenses'",
    )
    && hub.includes(
      "householdNavigationTarget === 'tasks'",
    )
    && hub.includes(
      "householdNavigationTarget === 'shopping'",
    )
    && hub.includes(
      "householdNavigationTarget === 'more'",
    ),
  'Household navigation highlight follows the current destination.',
);

check(
  css.includes(
    '.button.primary { color:#03211d; background:var(--accent);',
  )
    && css.includes(
      '.button.primary:hover { background:var(--accent-2);',
    ),
  'Space active navigation inherits BajetBN theme accent tokens.',
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
