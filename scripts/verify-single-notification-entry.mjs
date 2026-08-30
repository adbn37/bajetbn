import fs from 'node:fs';

const app = fs.readFileSync(
  'src/layouts/AppShell.tsx',
  'utf8',
).replace(/\r\n?/g, '\n');

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function section(startMarker, endMarker) {
  const start = app.indexOf(startMarker);

  if (start === -1) {
    failures.push(
      `Missing section marker: ${startMarker}`,
    );
    return '';
  }

  const end =
    app.indexOf(
      endMarker,
      start,
    );

  if (end === -1) {
    failures.push(
      `Missing section end: ${endMarker}`,
    );
    return '';
  }

  return app.slice(
    start,
    end,
  );
}

const mobileHeader = section(
  '<header className="mobile-header">',
  '</header>',
);

const desktopHeader = section(
  '<div className="desktop-environment">',
  '<ConnectivityBanner />',
);

const mobileNavigation = section(
  '<nav className="mobile-bottom-nav"',
  '</nav>',
);

/*
 * v1.14 mobile contract:
 *
 * Header:
 *   Search + Alerts
 *
 * Bottom:
 *   Business | Home | + | Space | More
 *
 * Environment wording is not shown
 * in the mobile customer header.
 */

expect(
  mobileHeader.includes(
    "navigate('/search')",
  ),
  'The mobile Search action is missing.',
);

expect(
  mobileHeader.includes(
    "navigate('/notifications')",
  ),
  'The mobile Alerts action is missing from the header.',
);

expect(
  mobileHeader.includes(
    'notification-button',
  ),
  'The mobile Alerts button is missing.',
);

expect(
  mobileHeader.includes(
    '<NotificationBellIcon />',
  ),
  'The mobile Alerts button must use the bell icon.',
);

expect(
  mobileHeader.includes(
    'unreadNotifications > 0',
  ),
  'The mobile Alerts unread badge is missing.',
);

expect(
  !mobileHeader.includes(
    'environment-badge',
  ),
  'The mobile environment badge must not be shown to normal users.',
);

/*
 * Desktop notification access remains.
 */

expect(
  desktopHeader.includes(
    "navigate('/notifications')",
  ),
  'The desktop notification button is missing.',
);

expect(
  desktopHeader.includes(
    '<NotificationBellIcon />',
  ),
  'The desktop notification button must use the bell icon.',
);

/*
 * Bottom navigation contract.
 */

const navTokens = [
  'Business',
  '<small>Home</small>',
  'mobile-bottom-add',
  '<small>Space</small>',
  '<small>More</small>',
];

let previous = -1;
let correctOrder = true;

for (const token of navTokens) {
  const index =
    mobileNavigation.indexOf(
      token,
    );

  if (
    index < 0
    || index <= previous
  ) {
    correctOrder = false;
    break;
  }

  previous = index;
}

expect(
  correctOrder,
  'Mobile navigation must be Business | Home | + | Space | More.',
);

expect(
  mobileNavigation.includes(
    'to="/spaces"',
  ),
  'The mobile Space destination is missing.',
);

expect(
  !mobileNavigation.includes(
    '<small>Alerts</small>',
  ),
  'Alerts must not remain in the mobile bottom navigation.',
);

expect(
  !mobileNavigation.includes(
    'to="/notifications"',
  ),
  'Notifications must not remain a mobile bottom-navigation destination.',
);

expect(
  (
    app.match(
      /function NotificationBellIcon\(\)/g,
    )
    || []
  ).length === 1,
  'Exactly one reusable notification bell component is required.',
);

if (failures.length) {
  console.error(
    failures
      .map(
        (failure) =>
          `- ${failure}`,
      )
      .join('\n'),
  );

  process.exit(1);
}

console.log(
  'Single notification-entry verification passed: '
  + 'mobile Alerts is in the header and bottom navigation is '
  + 'Business | Home | + | Space | More.',
);