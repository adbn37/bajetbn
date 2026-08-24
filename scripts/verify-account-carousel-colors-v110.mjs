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
  dashboard.includes('home-v110-account-carousel'),
  'Home account carousel is missing.',
);

check(
  dashboard.includes('home-v110-account-slide'),
  'Home account carousel slides are missing.',
);

check(
  dashboard.includes('home-v110-carousel-dots'),
  'Home account carousel indicators are missing.',
);

check(
  dashboard.includes('setPreferredHomeAccountId'),
  'Home does not remember the selected account.',
);

check(
  dashboard.includes('Current balance'),
  'Home account card must show Current balance.',
);

check(
  dashboard.includes('accountMonthSummary'),
  'Per-account monthly money summary is missing.',
);

check(
  !dashboard.includes('home-v110-accounts'),
  'Duplicate Your money section still exists.',
);

check(
  !dashboard.includes('overview-account-grid'),
  'Legacy Home account grid still exists.',
);

check(
  !dashboard.includes('add-account-tile'),
  'Legacy Add account tile still exists on Home.',
);

check(
  !dashboard.includes('const primaryAccount'),
  'Home still contains fixed primary-account logic.',
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
    'BAJETBN V1.10 ACCOUNT CAROUSEL COLORS',
  ),
  'Slice 5 CSS marker is missing.',
);

check(
  css.includes('scroll-snap-type: x mandatory'),
  'Account carousel does not use horizontal snap scrolling.',
);

console.log(
  `Account carousel and colour checks passed (${checks} checks).`,
);
