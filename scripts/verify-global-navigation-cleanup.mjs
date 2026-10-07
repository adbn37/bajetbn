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
  'budgets',
  'bills',
  'recurring',
  'debt',
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

check(
  desktopOrder.every(
    (id) =>
      navigation.includes(
        `id: '${id}'`,
      ),
  )
    && orderedBlock.includes(
      'sanitizePersonalisation(settings)',
    )
    && orderedBlock.includes(
      'normalized.navigationOrder',
    )
    && orderedBlock.includes(
      'normalized.pinnedNavigation',
    )
    && !orderedBlock.includes(
      'void settings',
    ),
  'Desktop navigation exposes the complete toolset using saved order and pinning.',
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
for (const token of ['<small>Home</small>', '<small>Transactions</small>', 'mobile-bottom-add', '<small>Spaces</small>', '<small>More</small>']) {
  check(mobile.includes(token), `Mobile navigation missing ${token}.`);
}
check(mobile.includes('to="/transactions"'), 'Mobile Transactions destination is missing.');
check(mobile.includes("navigate('/?quick=1')"), 'Mobile Add action is missing.');
check(mobile.includes('to="/spaces"'), 'Mobile Spaces destination is missing.');
check(mobile.includes('to="/more"'), 'Mobile More destination is missing.');
check(!mobile.includes('<small>Business</small>') && !mobile.includes('<small>Goals</small>'), 'Business and Goals do not occupy fixed mobile bottom-nav slots.');
check(
  morePage.includes('more-space-shortcuts-v116')
    && morePage.includes('Manage Spaces')
    && morePage.includes('to="/spaces"'),
  'More keeps Space shortcuts and Space management access.',
);
check(
  morePage.includes("space.type !== 'goal'"),
  'Goal / Plan Spaces stay out of the general More Space launcher.',
);
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
