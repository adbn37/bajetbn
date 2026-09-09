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
  'Home imports the all-active owned account reader.',
);

check(
  !dashboard.includes(
    'listPersonalAccounts',
  ),
  'Home is no longer restricted to Personal accounts.',
);

check(
  dashboard.includes(
    'await listAccounts(user.uid);',
  ),
  'Home loads active owned Personal and Business accounts.',
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
    "a.classification === 'business'",
  )
    && dashboard.includes(
      'return aGroup - bGroup;',
    ),
  'Personal accounts remain before Business accounts on Home.',
);

check(
  /const\s+quickAccounts\s*=[\s\S]{0,500}?classification[\s\S]{0,80}?===\s*'personal'/m.test(
    dashboard,
  ),
  'Global Add keeps a Personal-only account list.',
);

check(
  dashboard.includes(
    'accounts={quickAccounts}',
  ),
  'Home quick money form receives only Personal accounts.',
);

check(
  dashboard.includes(
    'quickAccounts.length === 0',
  ),
  'Home quick-add availability follows Personal accounts.',
);

check(
  dashboard.includes(
    "account.classification"
  )
    && dashboard.includes(
      "? 'Business'"
    ),
  'Business account cards are clearly labelled.',
);

check(
  dashboard.includes(
    'listTransactionsForOwnerAccount',
  ),
  'Selected owned Business account can drive Home activity.',
);

check(
  dashboard.includes(
    'Activity below follows this account',
  ),
  'Selected-account behaviour remains visible to the user.',
);

if (failures.length) {
  throw new Error(
    `Home Business account verification failed: ${failures.length} check(s).`,
  );
}

console.log(
  'Home Personal + Business account verification PASS.',
);