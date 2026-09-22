import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(
    file,
    'utf8',
  ).replace(/\r\n?/g, '\n');

const page =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const css =
  read(
    'src/styles/global.css',
  );

function check(value, label) {
  if (!value) {
    throw new Error(
      'FAIL: ' + label,
    );
  }

  console.log(
    'PASS: ' + label,
  );
}

const bodyIndex =
  page.indexOf(
    'className="trip-workbook-sheet-body-v115"',
  );

const tabIndex =
  page.indexOf(
    'className="trip-workbook-tabs-v115"',
  );

const supportIndex =
  page.indexOf(
    'className="trip-workbook-support-tabs-v115"',
  );

const footerIndex =
  page.indexOf(
    'className="trip-workbook-status-v115"',
  );

check(
  bodyIndex >= 0
  && tabIndex > bodyIndex
  && footerIndex > tabIndex,
  'Primary worksheet tabs sit below the active worksheet and above the workbook status bar.',
);

check(
  supportIndex > bodyIndex
  && css.includes(
    '.trip-workbook-support-tabs-v115 {\n  order: 20;'
  )
  && css.includes(
    '.trip-workbook-tabs-v115 {\n  order: 21;'
  ),
  'More support sheets render immediately above the bottom sheet strip.',
);

check(
  !css.includes(
    'BAJETBN V115 TRIP WORKBOOK SHELL'
  )
  && !css.includes(
    "data-trip-workbook-tabs='true'"
  )
  && !css.includes(
    '.trip-workbook-v115'
  ),
  'Obsolete launcher-era Trip workbook CSS is removed.',
);

check(
  css.includes(
    'BAJETBN V115 TRIP WORKBOOK COMPLETION'
  )
  && css.includes(
    '.trip-workbook-tabs-v115 {\n  order: 21;'
  )
  && css.includes(
    'border-radius: 0 0 7px 7px;'
  ),
  'Bottom workbook sheet-strip styling is installed.',
);

check(
  css.includes(
    '.space-collaboration-embedded'
  )
  && css.includes(
    '.space-chat-panel'
  )
  && css.includes(
    '.space-automation-panel'
  )
  && css.includes(
    '.space-settings-panel'
  ),
  'Embedded support tools inherit the same Trip workbook canvas.',
);

check(
  css.includes(
    'position: sticky;'
  )
  && css.includes(
    'bottom: 0;'
  ),
  'Desktop workbook sheet strip remains reachable at the bottom edge.',
);

for (const sheet of [
  'overview',
  'itinerary',
  'tasks',
  'bookings',
  'budget',
  'expenses',
  'fund',
  'settle',
  'bills',
  'members',
  'chat',
  'activity',
  'settings',
]) {
  check(
    page.includes(
      `'${sheet}'`
    ),
    `Trip workbook still includes ${sheet}.`,
  );
}

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP WORKBOOK COMPLETION: PASS',
);
