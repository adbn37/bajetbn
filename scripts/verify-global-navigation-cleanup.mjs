import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const navigation = read('src/services/personalisation.ts');
const customizer = read('src/components/SidebarCustomizer.tsx');
const shell = read('src/layouts/AppShell.tsx');
const morePage = read('src/pages/MorePage.tsx');
const styles = read('src/styles/global.css');

let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

for (const id of [
  'overview',
  'spaces',
  'transactions',
  'accounts',
  'budgets',
  'bills',
  'search',
]) {
  check(
    navigation.includes(`'${id}'`),
    `Recommended navigation is missing ${id}.`,
  );
}

for (const id of [
  'recurring',
  'goals',
  'calendar',
  'reports',
  'offline-sync',
]) {
  check(
    navigation.includes(`'${id}'`),
    `Optional navigation is missing ${id}.`,
  );
}

check(
  navigation.includes('RECOMMENDED_NAVIGATION_ORDER'),
  'Recommended navigation order is missing.',
);

check(
  navigation.includes('RECOMMENDED_HIDDEN_NAVIGATION'),
  'Recommended hidden navigation is missing.',
);

check(
  navigation.includes("id: 'overview'")
    && navigation.match(
      /id:\s*'overview'[\s\S]*?protected:\s*true/,
    ),
  'Overview must remain protected.',
);

check(
  navigation.includes("id: 'spaces'")
    && navigation.match(
      /id:\s*'spaces'[\s\S]*?protected:\s*true/,
    ),
  'Spaces must remain protected.',
);

check(
  navigation.includes(
    'orderSource = Array.isArray(value?.navigationOrder)',
  ),
  'Saved navigation order must remain respected.',
);

check(
  navigation.includes(
    'hiddenSource = Array.isArray(value?.hiddenNavigation)',
  ),
  'Saved hidden navigation must remain respected.',
);

check(
  customizer.includes('toggleHidden'),
  'Hide/show support was removed.',
);

check(
  customizer.includes('togglePinned'),
  'Pin support was removed.',
);

check(
  customizer.includes('dropOn'),
  'Drag/reorder support was removed.',
);

check(
  customizer.includes('Reset menu'),
  'Reset menu was removed.',
);

check(
  shell.includes('orderedNavigation'),
  'Desktop AppShell must continue using personalized navigation.',
);

const mobileNavStart = shell.indexOf(
  '<nav className="mobile-bottom-nav"',
);

const mobileNavEnd = shell.indexOf(
  '</nav>',
  mobileNavStart,
);

check(
  mobileNavStart >= 0
    && mobileNavEnd > mobileNavStart,
  'Mobile navigation section is missing.',
);

const mobileNavigation = shell.slice(
  mobileNavStart,
  mobileNavEnd,
);

const businessIndex =
  mobileNavigation.indexOf('<small>{businessPickerLoading');

const homeIndex =
  mobileNavigation.indexOf('<small>Home</small>');

const addIndex =
  mobileNavigation.indexOf('mobile-bottom-add');

const alertsIndex =
  mobileNavigation.indexOf('<small>Alerts</small>');

const moreIndex =
  mobileNavigation.indexOf('<small>More</small>');

check(
  businessIndex >= 0
    && businessIndex < homeIndex
    && homeIndex < addIndex
    && addIndex < alertsIndex
    && alertsIndex < moreIndex,
  'Mobile navigation order must remain Business, Home, Add, Alerts, More.',
);

check(
  mobileNavigation.includes('openBusinessShortcut'),
  'Mobile Business shortcut is missing.',
);

check(
  !mobileNavigation.includes('<small>POS</small>'),
  'POS must not remain as a global mobile navigation item.',
);

check(
  !shell.includes('openPosShortcut'),
  'Old global POS shortcut implementation must be removed.',
);

check(
  shell.includes("space.type === 'sme'"),
  'Business shortcut must target SME Business Spaces.',
);

check(
  shell.includes('smeSpaces.length === 1')
    && shell.includes(
      'navigate(`/spaces/${smeSpaces[0].id}`)',
    ),
  'A single Business must open directly.',
);

check(
  shell.includes('mobile-business-picker')
    && shell.includes('businessSpaces.map'),
  'Multiple Businesses must use the mobile drop-up picker.',
);

check(
  !shell.includes('aria-label="Open menu"'),
  'The mobile top hamburger menu must remain removed.',
);

check(
  mobileNavigation.includes("navigate('/?quick=1')"),
  'Mobile Add must keep opening the quick money action.',
);

check(
  mobileNavigation.includes('to="/notifications"'),
  'Mobile Alerts destination is missing.',
);

check(
  mobileNavigation.includes('<NotificationBellIcon />'),
  'Mobile Alerts must retain the notification bell.',
);

check(
  mobileNavigation.includes('unreadNotifications > 0'),
  'Mobile Alerts must retain the unread badge.',
);

check(
  mobileNavigation.includes('to="/more"'),
  'Mobile More destination is missing.',
);

check(
  morePage.includes('orderedNavigation(personalisation)')
    && morePage.includes('visibleNavigation.map'),
  'More must show the personalized main navigation.',
);

check(
  morePage.includes('secondaryNavigation(personalisation)')
    && morePage.includes('secondaryTools.map'),
  'More must show hidden More tools.',
);

check(
  morePage.includes('<SidebarCustomizer')
    && morePage.includes('Customize menu'),
  'More must provide menu customization.',
);

check(
  morePage.includes('void logOut()')
    && morePage.includes('Sign out'),
  'More must provide account sign out.',
);

check(
  morePage.includes('to="/settings"')
    && morePage.includes('to="/subscription"'),
  'More must provide Settings and Subscription.',
);

check(
  styles.includes('mobile-business-picker')
    && styles.includes(
      'BAJETBN V1.9.8 MOBILE BUSINESS NAV',
    ),
  'Mobile Business drop-up styles are missing.',
);

console.log(
  `Global navigation cleanup checks passed (${checks} checks).`,
);
