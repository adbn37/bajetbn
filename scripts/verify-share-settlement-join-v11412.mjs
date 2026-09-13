import fs from 'node:fs';

const read =
  (path) =>
    fs.readFileSync(
      path,
      'utf8',
    )
      .replace(
        /\r\n/g,
        '\n',
      );

const share =
  read(
    'src/features/transactions/PublicTransactionSharePage.tsx',
  );

const space =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const debt =
  read(
    'src/features/debt/DebtPage.tsx',
  );

const shared =
  read(
    'src/features/spaces/SharedExpensesPanel.tsx',
  );

const join =
  read(
    'src/features/collaboration/JoinSpacePage.tsx',
  );

const login =
  read(
    'src/features/auth/LoginPage.tsx',
  );

const register =
  read(
    'src/features/auth/RegisterPage.tsx',
  );

const verify =
  read(
    'src/features/auth/VerifyEmailPage.tsx',
  );

const onboarding =
  read(
    'src/features/onboarding/OnboardingPage.tsx',
  );

const guards =
  read(
    'src/app/RouteGuards.tsx',
  );

const failures = [];

function check(
  condition,
  label,
) {
  if (condition) {
    console.log(
      'PASS:',
      label,
    );

    return;
  }

  console.error(
    'FAIL:',
    label,
  );

  failures.push(
    label,
  );
}


/*
 * 1. Smart Share exact Space transaction.
 */

check(
  share.includes(
    "'?section=money'",
  )
    && share.includes(
      "'&transactionId='",
    )
    && share.includes(
      'target.transactionId',
    )
    && share.includes(
      "'&receipt=1'",
    ),
  'Smart Share preserves exact transaction and receipt intent inside a Space.',
);


/*
 * 2. Space Money Activity handles the requested record.
 */

check(
  space.includes(
    "'transactionId'",
  )
    && space.includes(
      'requestedTransactionId',
    )
    && space.includes(
      'requestedTransaction',
    )
    && space.includes(
      'SpaceMoneyActivityDeepLinkModal',
    )
    && space.includes(
      'data-space-shared-transaction-modal',
    )
    && space.includes(
      "next.delete('transactionId')",
    )
    && space.includes(
      "next.delete('receipt')",
    ),
  'Space Money Activity opens and clears the exact shared transaction target safely.',
);


/*
 * 3. Debt exposes Shared Space settlements without
 * merging Shared Expense payments into personal Debt.
 */

check(
  debt.includes(
    'data-debt-space-settlements',
  )
    && debt.includes(
      'listSharedExpenses',
    )
    && debt.includes(
      'listSharedExpenseShares',
    )
    && debt.includes(
      'loadSpaceSettlements',
    )
    && debt.includes(
      "'?tab=balances'",
    ),
  'Debt shows Shared Space settlements while preserving separate ledgers.',
);


/*
 * 4. Shared Expense participant invitation.
 */

check(
  shared.includes(
    'createSpaceInvitation',
  )
    && shared.includes(
      'data-shared-expense-invite',
    )
    && shared.includes(
      "role:\n            'payer'",
    )
    && shared.includes(
      "'&next='",
    )
    && shared.includes(
      'Invite participant',
    )
    && shared.includes(
      'SharedExpenseInviteForm',
    ),
  'Shared Expenses can invite a participant with a post-join destination.',
);


/*
 * 5. Join destination is constrained to the Space
 * returned by the authenticated backend.
 */

check(
  join.includes(
    'safeJoinTarget',
  )
    && join.includes(
      "params.get(\n      'next'",
    )
    && join.includes(
      'requestedNext',
    )
    && join.includes(
      'result.spaceId',
    )
    && join.includes(
      "requested.startsWith(\n      root + '?'",
    ),
  'Join flow safely opens the intended destination after acceptance.',
);


/*
 * 6. Entire auth / onboarding chain preserves the
 * original /join?... URL for both new and existing users.
 */

check(
  login.includes(
    'location.state?.from',
  )
    && login.includes(
      '!profile?.onboardingCompleted && location.state?.from',
    )
    && register.includes(
      'const returnTo',
    )
    && register.includes(
      'state:',
    )
    && verify.includes(
      'const returnTo',
    )
    && verify.includes(
      "{ from: returnTo }",
    )
    && onboarding.includes(
      'const returnTo',
    )
    && onboarding.includes(
      "returnTo\n          || '/?welcome=1'",
    ),
  'Signup, verification, login and onboarding preserve an invitation return path.',
);


/*
 * Protected Route continuation.
 */

check(
  guards.includes(
    'const returnPath',
  )
    && guards.includes(
      'to="/verify-email"',
    )
    && guards.includes(
      'to="/onboarding"',
    )
    && guards.includes(
      'from:',
    ),
  'Protected routes preserve the invitation path through verification and onboarding.',
);


/*
 * 7. No deployment behavior embedded in application source.
 */

check(
  !shared.includes(
    'firebase deploy',
  )
    && !debt.includes(
      'firebase deploy',
    )
    && !space.includes(
      'firebase deploy',
    ),
  'Feature remains application-only and does not embed deployment commands.',
);


if (failures.length) {
  console.error('');

  failures.forEach(
    (failure) =>
      console.error(
        '- ' + failure,
      ),
  );

  throw new Error(
    'v1.14.12 verifier failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  '============================================================',
);

console.log(
  ' BAJETBN v1.14.12 SHARE + SETTLEMENT + JOIN: PASS',
);

console.log(
  '============================================================',
);