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

expect(
  !mobileHeader.includes('/notifications'),
  'The mobile header must not contain a notification link.',
);

expect(
  !mobileHeader.includes('notification-button'),
  'The duplicate mobile-header notification button remains.',
);

expect(
  mobileHeader.includes("navigate('/search')"),
  'The mobile Search action must remain available.',
);

expect(
  mobileHeader.includes('environment-badge'),
  'The mobile environment badge must remain available.',
);

expect(
  desktopHeader.includes("navigate('/notifications')"),
  'The desktop notification button is missing.',
);

expect(
  desktopHeader.includes('<NotificationBellIcon />'),
  'The desktop notification button must use the bell icon.',
);

expect(
  mobileNavigation.includes('to="/notifications"'),
  'The mobile Alerts destination is missing.',
);

expect(
  mobileNavigation.includes('<small>Alerts</small>'),
  'The mobile Alerts label is missing.',
);

expect(
  mobileNavigation.includes('<NotificationBellIcon />'),
  'The mobile Alerts destination must use the bell icon.',
);

expect(
  mobileNavigation.includes('unreadNotifications > 0'),
  'The mobile unread badge is missing.',
);

expect(
  (
    app.match(/function NotificationBellIcon\(\)/g)
    || []
  ).length === 1,
  'Exactly one reusable notification bell component is required.',
);

if (failures.length) {
  console.error(
    failures.map((failure) => `- ${failure}`).join('\n'),
  );

  process.exit(1);
}

console.log(
  'Single notification-entry verification passed: '
  + 'mobile uses bottom Alerts and desktop uses one header bell.',
);
