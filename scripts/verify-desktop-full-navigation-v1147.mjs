import fs from 'node:fs';

const read =
  (path) =>
    fs
      .readFileSync(
        path,
        'utf8',
      )
      .replace(
        /\\r\\n?/g,
        '\\n',
      );

const navigation =
  read(
    'src/services/personalisation.ts',
  );

const shell =
  read(
    'src/layouts/AppShell.tsx',
  );

const css =
  read(
    'src/styles/global.css',
  );

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log(
      'PASS: ' + label,
    );
    return;
  }

  console.error(
    'FAIL: ' + label,
  );

  failures.push(label);
}

const desktopNavigation = [
  ['overview', '/'],
  ['transactions', '/transactions'],
  ['spaces', '/spaces'],
  ['inbox', '/inbox'],
  ['accounts', '/accounts'],
  ['budgets', '/budgets'],
  ['bills', '/bills'],
  ['recurring', '/recurring'],
  ['debt', '/debt'],
  ['goals', '/goals'],
  ['calendar', '/calendar'],
  ['reports', '/reports'],
  ['search', '/search'],
  ['offline-sync', '/offline-sync'],
];

for (const [id, path] of desktopNavigation) {
  check(
    navigation.includes(
      `id: '${id}'`,
    )
      && navigation.includes(
        `path: '${path}'`,
      ),
    `Navigation definition exists for ${id}.`,
  );
}

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
  Boolean(orderedBlock)
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
    )
    && !orderedBlock.includes(
      'desktopNavigationOrder',
    ),
  'Desktop menu uses saved personalisation while retaining the complete navigation set.',
);

const mobileStart =
  shell.indexOf(
    '<nav className="mobile-bottom-nav"',
  );

const mobileEnd =
  shell.indexOf(
    '</nav>',
    mobileStart,
  );

const desktopShell =
  mobileStart >= 0
    ? shell.slice(
        0,
        mobileStart,
      )
    : shell;

const mobileShell =
  mobileStart >= 0
    && mobileEnd > mobileStart
      ? shell.slice(
          mobileStart,
          mobileEnd,
        )
      : '';

check(
  !desktopShell.includes(
    '<NavLink to="/more"',
  )
    && !desktopShell.includes(
      '<span className="nav-label">More</span>',
    ),
  'Desktop global More entry is removed.',
);

check(
  !desktopShell.includes(
    'More tools',
  ),
  'Desktop does not hide tools behind a More tools submenu.',
);

for (const token of [
  '<small>Home</small>',
  '<small>Transactions</small>',
  'mobile-bottom-add',
  '<small>Goals</small>',
  '<small>More</small>',
]) {
  check(
    mobileShell.includes(token),
    'Mobile navigation preserves '
      + token
      + '.',
  );
}

check(
  mobileShell.includes(
    'to="/transactions"',
  ),
  'Mobile Transactions route remains available.',
);

check(
  mobileShell.includes(
    'to="/goals"',
  ),
  'Mobile Goals route remains available.',
);

check(
  mobileShell.includes(
    'to="/more"',
  ),
  'Mobile More route remains available.',
);

check(
  !mobileShell.includes(
    '<small>Business</small>',
  )
    && !mobileShell.includes(
      '<small>Space</small>',
    ),
  'Business and Space are removed from dedicated mobile bottom-nav slots.',
);

check(
  shell.includes(
    'orderedNavigation(personalisation)',
  )
    && shell.includes(
      'SidebarCustomizer',
    )
    && shell.includes(
      'Customize menu',
    ),
  'Desktop shell renders live personalised navigation and exposes the customizer.',
);

check(
  css.includes(
    '.sidebar nav',
  )
    && (
      css.includes(
        'overflow-y: auto',
      )
      || css.includes(
        'overflow: auto',
      )
    ),
  'Desktop sidebar menu supports vertical scrolling.',
);

check(
  !navigation.includes(
    'CORE_NAVIGATION_ORDER',
  ),
  'Desktop navigation is no longer limited to the old four core items.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error(
      '- ' + failure,
    );
  }

  throw new Error(
    'Desktop full navigation verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  'DESKTOP FULL NAVIGATION v1.14.7 VERIFICATION PASS',
);
