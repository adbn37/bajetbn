import fs from 'node:fs';

const read =
  (file) =>
    fs.readFileSync(
      file,
      'utf8',
    );

const navigation =
  read(
    'src/services/personalisation.ts',
  );

const customizer =
  read(
    'src/components/SidebarCustomizer.tsx',
  );

const shell =
  read(
    'src/layouts/AppShell.tsx',
  );

const morePage =
  read(
    'src/pages/MorePage.tsx',
  );

const styles =
  read(
    'src/styles/global.css',
  );

let checks = 0;

function check(condition, message) {
  checks += 1;

  if (!condition) {
    throw new Error(message);
  }
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
    navigation.includes(
      `'${id}'`,
    ),
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
    navigation.includes(
      `'${id}'`,
    ),
    `Optional navigation is missing ${id}.`,
  );
}

check(
  navigation.includes(
    'RECOMMENDED_NAVIGATION_ORDER',
  ),
  'Recommended navigation order is missing.',
);

check(
  navigation.includes(
    'RECOMMENDED_HIDDEN_NAVIGATION',
  ),
  'Recommended hidden navigation is missing.',
);

check(
  navigation.includes(
    "id: 'overview'",
  )
    && navigation.match(
      /id:\s*'overview'[\s\S]*?protected:\s*true/,
    ),
  'Overview must remain protected.',
);

check(
  navigation.includes(
    "id: 'spaces'",
  )
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
  customizer.includes(
    'toggleHidden',
  ),
  'Hide/show support was removed.',
);

check(
  customizer.includes(
    'togglePinned',
  ),
  'Pin support was removed.',
);

check(
  customizer.includes(
    'dropOn',
  ),
  'Drag/reorder support was removed.',
);

check(
  customizer.includes(
    'Reset menu',
  ),
  'Reset menu was removed.',
);

check(
  shell.includes(
    'orderedNavigation',
  ),
  'Desktop AppShell must continue using personalized navigation.',
);

const mobileClassMarker =
  shell.indexOf(
    'className="mobile-bottom-nav',
  );

check(
  mobileClassMarker >= 0,
  'Mobile navigation class is missing.',
);

const mobileNavStart =
  shell.lastIndexOf(
    '<nav',
    mobileClassMarker,
  );

const mobileNavEnd =
  shell.indexOf(
    '</nav>',
    mobileClassMarker,
  );

check(
  mobileNavStart >= 0
    && mobileNavEnd > mobileNavStart,
  'Mobile navigation section is missing.',
);

const mobileNavigation =
  shell.slice(
    mobileNavStart,
    mobileNavEnd
      + '</nav>'.length,
  );

const homeIndex =
  mobileNavigation.indexOf(
    '<small>Home</small>',
  );

const spacesIndex =
  mobileNavigation.indexOf(
    '<small>Spaces</small>',
  );

const addIndex =
  mobileNavigation.indexOf(
    'mobile-bottom-add',
  );

const moreIndex =
  mobileNavigation.indexOf(
    '<small>More</small>',
  );

check(
  homeIndex >= 0
    && spacesIndex > homeIndex
    && addIndex > spacesIndex
    && moreIndex > addIndex,
  'Mobile navigation order must be Home, Spaces, Add, More.',
);

check(
  mobileNavigation.includes(
    'to="/spaces"',
  ),
  'Spaces must be a first-class mobile destination.',
);

check(
  mobileNavigation.includes(
    "navigate('/?quick=1')",
  ),
  'Mobile Add must keep opening the quick money action.',
);

check(
  mobileNavigation.includes(
    'to="/more"',
  ),
  'Mobile More destination is missing.',
);

check(
  !mobileNavigation.includes(
    '<small>Alerts</small>',
  ),
  'Obsolete Alerts bottom-nav destination remains.',
);

check(
  !mobileNavigation.includes(
    'to="/notifications"',
  ),
  'Notifications must live in the responsive header, not bottom nav.',
);

check(
  !mobileNavigation.includes(
    '<small>Business</small>',
  )
    && !mobileNavigation.includes(
      'businessPickerLoading',
    ),
  'Obsolete Business bottom-nav destination remains.',
);

check(
  !shell.includes(
    'openBusinessShortcut',
  ),
  'Old global Business shortcut implementation must be removed.',
);

check(
  !shell.includes(
    'businessPickerOpen',
  )
    && !shell.includes(
      'businessSpaces.map',
    ),
  'Old mobile Business picker runtime must be removed.',
);

check(
  !mobileNavigation.includes(
    '<small>POS</small>',
  ),
  'POS must not remain as a global mobile navigation item.',
);

check(
  !shell.includes(
    'openPosShortcut',
  ),
  'Old global POS shortcut implementation must remain removed.',
);

check(
  !shell.includes(
    'aria-label="Open menu"',
  ),
  'The mobile top hamburger menu must remain removed.',
);

check(
  shell.includes(
    "navigate('/notifications')",
  )
    && shell.includes(
      '<NotificationBellIcon />',
    ),
  'Responsive header notification access is missing.',
);

check(
  morePage.includes(
    'orderedNavigation(personalisation)',
  )
    && morePage.includes(
      'visibleNavigation.map',
    ),
  'More must show the personalized main navigation.',
);

check(
  morePage.includes(
    'secondaryNavigation(personalisation)',
  )
    && morePage.includes(
      'secondaryTools.map',
    ),
  'More must show hidden More tools.',
);

check(
  morePage.includes(
    '<SidebarCustomizer',
  )
    && morePage.includes(
      'Customize menu',
    ),
  'More must provide menu customization.',
);

check(
  morePage.includes(
    'void logOut()',
  )
    && morePage.includes(
      'Sign out',
    ),
  'More must provide account sign out.',
);

check(
  morePage.includes(
    'to="/settings"',
  )
    && morePage.includes(
      'to="/subscription"',
    ),
  'More must provide Settings and Subscription.',
);

check(
  styles.includes(
    'v1.11.0 Global Home + mobile navigation',
  ),
  'v1.11 Global Home/navigation styles are missing.',
);

check(
  styles.includes(
    'repeat(4, minmax(0, 1fr))',
  ),
  'Mobile bottom navigation must use four equal slots.',
);

console.log(
  `Global navigation cleanup checks passed (${checks} checks): `
  + 'Home, Spaces, Add, More with responsive-header notifications.',
);