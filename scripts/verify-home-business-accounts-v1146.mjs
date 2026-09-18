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
    "import { listAccounts } from '../repositories/accountRepository';",
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
  /const\s+homeAccounts\s*=[\s\S]{0,500}?classification[\s\S]{0,80}?===\s*'personal'/m.test(
    dashboard,
  ),
  'Personal Home displays Personal accounts only.',
);

check(
  /const\s+quickAccounts\s*=[\s\S]{0,500}?classification[\s\S]{0,80}?===\s*'personal'/m.test(
    dashboard,
  ),
  'Global Add remains Personal-account only.',
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
  'Selected Personal account drives Recent Activity.',
);

check(
  dashboard.includes(
    'Personal only · Business excluded',
  ),
  'Home explicitly identifies Personal-only assets.',
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
  'Home Personal-first account verification PASS.',
);
