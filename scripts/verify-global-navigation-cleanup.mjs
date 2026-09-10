import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const navigation = read('src/services/personalisation.ts');
const shell = read('src/layouts/AppShell.tsx');
const morePage = read('src/pages/MorePage.tsx');

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

for (const id of ['overview', 'spaces', 'transactions', 'accounts', 'budgets', 'bills', 'search']) {
  check(navigation.includes(`'${id}'`), `Navigation is missing ${id}.`);
}
const desktopOrder = [
  'overview',
  'transactions',
  'spaces',
  'inbox',
  'accounts',
  'debt',
  'budgets',
  'bills',
  'recurring',
  'goals',
  'calendar',
  'reports',
  'search',
  'offline-sync',
];

const orderedStart =
  navigation.indexOf(
    'export function orderedNavigation(',
  );

const orderedEnd =
  navigation.indexOf(
    'export function secondaryNavigation(',
    orderedStart,
  );

const orderedBlock =
  orderedStart >= 0
    && orderedEnd > orderedStart
      ? navigation.slice(
          orderedStart,
          orderedEnd,
        )
      : '';

let previousDesktopItem = -1;

const desktopOrderValid =
  desktopOrder.every(
    (id) => {
      const position =
        orderedBlock.indexOf(
          `'${id}'`,
        );

      const valid =
        position > previousDesktopItem;

      previousDesktopItem =
        position;

      return valid;
    },
  );

check(
  desktopOrderValid,
  'Desktop navigation exposes the complete money and planning toolset in the approved order.',
);

const mobileStart =
  shell.indexOf(
    '<nav className="mobile-bottom-nav"',
  );

const desktopShell =
  mobileStart >= 0
    ? shell.slice(
        0,
        mobileStart,
      )
    : shell;

check(
  !desktopShell.includes(
    '<NavLink to="/more"',
  )
    && !desktopShell.includes(
      '<span className="nav-label">More</span>',
    ),
  'Desktop More is removed while full navigation is visible directly.',
);

const start = shell.indexOf('<nav className="mobile-bottom-nav"');
const end = shell.indexOf('</nav>', start);
const mobile = start >= 0 && end > start ? shell.slice(start, end) : '';
for (const token of ['<small>Business</small>', '<small>Home</small>', 'mobile-bottom-add', '<small>Space</small>', '<small>More</small>']) {
  check(mobile.includes(token), `Mobile navigation missing ${token}.`);
}
check(mobile.includes('openBusinessShortcut') && shell.includes('businessSpaces.map'), 'Mobile Business shortcut or Business picker is missing.');
check(mobile.includes("navigate('/?quick=1')"), 'Mobile Add action is missing.');
check(mobile.includes('to="/spaces"'), 'Mobile Spaces destination is missing.');
check(mobile.includes('to="/more"'), 'Mobile More destination is missing.');
check(morePage.includes('data-simplified-more'), 'More page simplification marker is missing.');
check(!morePage.includes('NAVIGATION_DESCRIPTIONS'), 'More no longer repeats descriptions for every tool.');
check(
  morePage.includes('Sign out')
    && (
      morePage.includes('to="/settings"')
      || morePage.includes("to: '/settings'")
    )
    && (
      morePage.includes('to="/subscription"')
      || morePage.includes("to: '/subscription'")
    ),
  'More keeps account essentials.',
);
console.log(`Global navigation cleanup checks passed (${checks} checks).`);
