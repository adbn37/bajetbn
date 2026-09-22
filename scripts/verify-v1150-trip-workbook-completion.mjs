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

check(
  tabIndex >= 0
  && supportIndex > tabIndex
  && bodyIndex > supportIndex,
  'Primary and support sheet navigation sit above the active worksheet.',
);

check(
  !page.includes(
    'className="trip-workbook-toolbar-v115"'
  )
  && !page.includes(
    'className="trip-workbook-status-v115"'
  ),
  'Workbook keeps only useful navigation chrome.',
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
  'Obsolete launcher-era Trip workbook CSS remains removed.',
);

check(
  css.includes(
    'BAJETBN V115 TRIP WORKBOOK COMPLETION'
  )
  && css.includes(
    'border-radius: 7px 7px 0 0;'
  ),
  'Top workbook sheet-strip styling remains installed.',
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
    'top: 0;'
  )
  && css.includes(
    'bottom: auto;'
  ),
  'Desktop workbook sheet strip stays reachable at the top edge.',
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
