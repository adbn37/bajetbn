import fs from 'node:fs';

const read =
  (path) =>
    fs
      .readFileSync(
        path,
        'utf8',
      )
      .replace(
        /\r\n?/g,
        '\n',
      );

const page =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const hub =
  read(
    'src/features/spaces/SpaceActionHub.tsx',
  );

const css =
  read(
    'src/styles/global.css',
  );

const rules =
  read(
    'firestore.rules',
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
  'label="Chat"',
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
  'Household navigation order is Home, Fund, Bills, Expenses, To-Do, Shopping, Chat, More.',
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
      "householdNavigationTarget === 'chat'",
    )
    && hub.includes(
      "householdNavigationTarget === 'more'",
    ),
  'Household navigation highlight follows the current destination.',
);

const householdMainUsesRoutes =
  householdBlock.includes('?section=fund')
  && householdBlock.includes('?section=bills')
  && householdBlock.includes('?section=shared-expenses')
  && householdBlock.includes('?section=todo')
  && householdBlock.includes('?section=shopping')
  && householdBlock.includes('?section=chat')
  && !householdBlock.includes("setTool('fund')")
  && !householdBlock.includes("setTool('expenses')")
  && !householdBlock.includes("setTool('tasks')")
  && !householdBlock.includes("setTool('shopping')");

check(
  householdMainUsesRoutes,
  'Household primary navigation routes to inline Space sections instead of tool modals.',
);

const moreAreaStart =
  hub.indexOf(
    '{spaceMoreOpen &&',
  );

const householdMoreStart =
  hub.indexOf(
    "{space.type === 'household' && <>",
    moreAreaStart,
  );

const householdMoreEnd =
  hub.indexOf(
    '</>}',
    householdMoreStart,
  );

const householdMoreBlock =
  householdMoreStart >= 0
    && householdMoreEnd > householdMoreStart
      ? hub.slice(
          householdMoreStart,
          householdMoreEnd,
        )
      : '';

check(
  householdMoreBlock.includes('label="Budget"')
    && householdMoreBlock.includes('label="Members"')
    && householdMoreBlock.includes('label="Activity"')
    && householdMoreBlock.includes('label="Settings"')
    && !householdMoreBlock.includes('label="Bills"')
    && !householdMoreBlock.includes('Settlements')
    && !householdMoreBlock.includes('?tab='),
  'Household More keeps secondary sections, removes Settlements, and avoids legacy tab navigation.',
);

check(
  page.includes(
    'data-household-inline-section',
  )
    && page.includes(
      "householdInlineSection === 'fund'",
    )
    && page.includes(
      "householdInlineSection === 'shared-expenses'",
    )
    && page.includes(
      "householdInlineSection === 'todo'",
    )
    && page.includes(
      "householdInlineSection === 'shopping'",
    )
    && page.includes(
      "householdInlineSection === 'chat'",
    )
    && page.includes(
      "householdInlineSection === 'bills'",
    )
    && page.includes(
      "householdInlineSection === 'budgets'",
    )
    && page.includes(
      "householdInlineSection === 'members'",
    )
    && page.includes(
      "householdInlineSection === 'activity'",
    )
    && page.includes(
      "householdInlineSection === 'settings'",
    ),
  'Household modules render inside the persistent Space shell.',
);

check(
  page.includes(
    'const lightweightHouseholdSection',
  )
    && page.includes(
      '&& !lightweightHouseholdSection',
    ),
  'Household inline tools do not trigger the heavy overview bundle.',
);

check(
  page.includes(
    'householdInlineSection\n        ? null\n        : <SpaceOverview',
  ),
  'Household routed sections bypass the legacy SpaceOverview modal surface.',
);

check(
  css.includes(
    '/* v1.14.7 Household inline Space sections */',
  )
    && css.includes(
      '.household-inline-section-v1147',
    ),
  'Household inline sections have responsive shell styling.',
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
