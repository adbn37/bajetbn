import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const models =
  read('src/types/models.ts');

const accountAvatar =
  read(
    'src/features/accounts/AccountAvatar.tsx',
  );

const accountSettings =
  read(
    'src/features/accounts/AccountAvatarSettings.tsx',
  );

const transactions =
  read(
    'src/features/transactions/TransactionsPage.tsx',
  );

const accounts =
  read(
    'src/features/accounts/AccountsPage.tsx',
  );

const dashboard =
  read('src/pages/DashboardPage.tsx');

const spaceAvatar =
  read(
    'src/features/spaces/SpaceAvatar.tsx',
  );

const functions =
  read('functions/src/index.ts');

const storage =
  read('storage.rules');

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
  models.includes(
    'avatarPath?: string | null;',
  ),
  'Account model stores one shared custom icon path.',
);

check(
  accountAvatar.includes(
    'getAccountAvatarUrl',
  )
    && accountAvatar.includes(
      'account.avatarPath',
    ),
  'AccountAvatar prefers the uploaded account icon.',
);

check(
  accountSettings.includes(
    'uploadAccountAvatar',
  )
    && accountSettings.includes(
      'removeAccountAvatar',
    ),
  'Edit account can upload and remove its shared icon.',
);

check(
  transactions.includes(
    '<AccountAvatar',
  ),
  'Money form uses shared AccountAvatar.',
);

check(
  accounts.includes(
    '<AccountAvatar',
  )
    && accounts.includes(
      '<AccountAvatarSettings',
    ),
  'Accounts page uses and manages shared AccountAvatar.',
);

check(
  dashboard.includes(
    '<AccountAvatar',
  ),
  'Home account cards use shared AccountAvatar.',
);

check(
  spaceAvatar.includes(
    'SpaceFallbackIcon',
  )
    && spaceAvatar.includes(
      'space.avatarPath',
    ),
  'SpaceAvatar uses uploaded icon with semantic fallback.',
);

check(
  functions.includes(
    'export const setAccountAvatar',
  )
    && functions.includes(
      'export const removeAccountAvatar',
    ),
  'Account avatar Cloud Functions are present.',
);

check(
  storage.includes(
    'match /accounts/{accountId}/avatar/{fileName}',
  )
    && storage.includes(
      'canReadAccountVisual',
    ),
  'Storage rules protect account avatar files.',
);

if (failures.length) {
  throw new Error(
    'Account/Space identity verification failed: '
    + failures.length
    + ' check(s).',
  );
}

console.log(
  'Account + Space identity verification PASS.',
);
