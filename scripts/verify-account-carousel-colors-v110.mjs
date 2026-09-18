import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const dashboard =
  read('src/pages/DashboardPage.tsx');

const accounts =
  read('src/features/accounts/AccountsPage.tsx');

const preferences =
  read('src/services/accountVisualPreferences.ts');

const css =
  read('src/styles/global.css');

let checks = 0;

function check(condition, message) {
  checks += 1;

  if (!condition) {
    throw new Error(message);
  }
}

check(
  dashboard.includes('bajetbn-home-account-strip'),
  'Home compact account strip is missing.',
);

check(
  dashboard.includes('bajetbn-home-account-card'),
  'Home compact account cards are missing.',
);

check(
  dashboard.includes('setPreferredHomeAccountId'),
  'Home does not remember the selected account.',
);

check(
  dashboard.includes('getAccountColor')
    && dashboard.includes('accountColorClass'),
  'Home account colour preferences are not applied.',
);

check(
  dashboard.includes('ledgerBalanceMinor'),
  'Home account card must show the live balance.',
);

check(
  dashboard.includes('accountMonthSummary'),
  'Per-account monthly money summary helper must remain available.',
);

check(
  !dashboard.includes('home-v110-accounts'),
  'Duplicate legacy Your money section still exists.',
);

check(
  !dashboard.includes('overview-account-grid'),
  'Legacy Home account grid still exists.',
);

check(
  accounts.includes('ACCOUNT_COLOR_OPTIONS'),
  'Account colour palette is missing.',
);

check(
  accounts.includes('setAccountColor'),
  'Account colour saving is missing.',
);

check(
  accounts.includes('account-color-picker'),
  'Account edit colour picker is missing.',
);

check(
  preferences.includes(
    'bajetbn.account-visuals.v1:',
  ),
  'Per-user account visual preference storage is missing.',
);

check(
  preferences.includes('homeAccountId'),
  'Preferred Home account storage is missing.',
);

check(
  css.includes(
    'BAJETBN V115 PERSONAL HOME APPROVED REFERENCE',
  ),
  'v1.15 Home reference CSS marker is missing.',
);

check(
  css.includes('scroll-snap-type: x proximity'),
  'Compact account strip does not use horizontal snap scrolling.',
);

console.log(
  'Compact Home account strip and colour checks passed ('
    + checks
    + ' checks).',
);
