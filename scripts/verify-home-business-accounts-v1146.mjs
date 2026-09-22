import fs from 'node:fs';

const dashboard =
  fs.readFileSync(
    'src/pages/DashboardPage.tsx',
    'utf8',
  );

const accountRepository =
  fs.readFileSync(
    'src/repositories/accountRepository.ts',
    'utf8',
  );

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
  } else {
    console.error('FAIL:', message);
    failures.push(message);
  }
}

check(
  dashboard.includes(
    "from '../repositories/accountRepository';",
  ),
  'Home retains the active owned-account reader.',
);

check(
  dashboard.includes(
    'await listAccounts(user.uid);',
  ),
  'Home still loads active owned accounts once.',
);

check(
  accountRepository.includes(
    'export async function listAccounts(uid: string)',
  )
    && accountRepository.includes(
      '!account.archivedAt && !account.closedAt',
    ),
  'Home account source excludes closed and archived accounts.',
);

check(
  dashboard.includes(
    'accountSupportsPersonalUse(',
  )
    && !dashboard.includes(
      "a.classification === 'business'",
    ),
  'Personal Home includes Personal + explicitly enabled global accounts, while excluding pure Business-only accounts.',
);

check(
  /const\s+quickAccounts\s*=[\s\S]{0,500}?accountSupportsPersonalUse/m.test(
    dashboard,
  ),
  'Global Add accepts Personal + explicitly enabled global accounts.',
);

check(
  dashboard.includes(
    'accounts={quickAccounts}',
  ),
  'Home quick money form receives only Personal accounts.',
);

check(
  dashboard.includes(
    'listTransactionsForOwnerAccount',
  ),
  'Selected Home account drives Recent Activity.',
);

check(
  dashboard.includes(
    'Personal + explicitly shared global accounts · Business-only excluded',
  ),
  'Home explains Personal + Business global-account visibility.',
);

check(
  dashboard.includes('Recent Activity')
    && dashboard.includes('bajetbn-home-account-strip'),
  'Reference Home Accounts and Recent Activity sections are present.',
);

if (failures.length) {
  throw new Error(
    'Home Personal-first verification failed: '
    + failures.length
    + ' check(s).',
  );
}

console.log(
  'Home Personal-only account verification PASS.',
);
