import fs from 'node:fs';

const app = fs.readFileSync(
  'src/layouts/AppShell.tsx',
  'utf8',
);

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function section(startMarker, endMarker) {
  const start = app.indexOf(startMarker);

  if (start === -1) {
    failures.push(`Missing section marker: ${startMarker}`);
    return '';
  }

  const end = app.indexOf(endMarker, start);

  if (end === -1) {
    failures.push(`Missing section end: ${endMarker}`);
    return '';
  }

  return app.slice(start, end);
}

function navigationSection() {
  const marker =
    'className="mobile-bottom-nav';

  const markerIndex =
    app.indexOf(marker);

  if (markerIndex === -1) {
    failures.push(
      'Missing mobile bottom navigation class.',
    );

    return '';
  }

  const start =
    app.lastIndexOf(
      '<nav',
      markerIndex,
    );

  const end =
    app.indexOf(
      '</nav>',
      markerIndex,
    );

  if (
    start === -1
    || end === -1
  ) {
    failures.push(
      'Could not resolve mobile bottom navigation boundaries.',
    );

    return '';
  }

  return app.slice(
    start,
    end + '</nav>'.length,
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

const mobileNavigation =
  navigationSection();

expect(
  mobileHeader.includes(
    "navigate('/search')",
  ),
  'The mobile Search action must remain available.',
);

expect(
  mobileHeader.includes(
    "navigate('/notifications')",
  ),
  'The mobile header notification action is missing.',
);

expect(
  mobileHeader.includes(
    'notification-button',
  ),
  'The mobile notification button is missing.',
);

expect(
  mobileHeader.includes(
    '<NotificationBellIcon />',
  ),
  'The mobile notification action must use the bell icon.',
);

expect(
  mobileHeader.includes(
    'unreadNotifications > 0',
  ),
  'The mobile notification unread badge is missing.',
);

expect(
  mobileHeader.includes(
    'environment-badge',
  ),
  'The mobile environment badge must remain available.',
);

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

expect(
  !mobileNavigation.includes(
    'to="/notifications"',
  ),
  'Notifications must not consume a mobile bottom-nav destination.',
);

expect(
  !mobileNavigation.includes(
    '<small>Alerts</small>',
  ),
  'The obsolete mobile Alerts tab remains.',
);

expect(
  mobileNavigation.includes(
    '<small>Home</small>',
  ),
  'The mobile Home destination is missing.',
);

expect(
  mobileNavigation.includes(
    '<small>Spaces</small>',
  ),
  'The mobile Spaces destination is missing.',
);

expect(
  mobileNavigation.includes(
    'mobile-bottom-add',
  ),
  'The mobile Add destination is missing.',
);

expect(
  mobileNavigation.includes(
    '<small>More</small>',
  ),
  'The mobile More destination is missing.',
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
        (failure) => `- ${failure}`,
      )
      .join('\n'),
  );

  process.exit(1);
}

console.log(
  'Single notification-entry verification passed: '
  + 'mobile and desktop use their responsive header bell, '
  + 'while mobile bottom navigation remains Home, Spaces, Add, More.',
);