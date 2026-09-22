import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const page =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const centre =
  read(
    'src/features/spaces/TripCommandCentre.tsx',
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

check(
  page.includes(
    "space.type !== 'trip'"
  )
  && page.includes(
    '<SpaceActionHub'
  ),
  'Trip no longer uses the generic SpaceActionHub launcher.',
);

check(
  page.includes(
    'className="trip-workbook-shell-v115"'
  )
  && page.includes(
    'className="trip-workbook-tabs-v115"'
  )
  && page.includes(
    'className="trip-workbook-sheet-body-v115"'
  ),
  'Trip owns one persistent workbook frame with top sheet navigation.',
);

check(
  !page.includes(
    'className="trip-workbook-toolbar-v115"'
  )
  && !page.includes(
    'className="trip-workbook-status-v115"'
  ),
  'Redundant internal workbook toolbar and status footer are removed.',
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
]) {
  check(
    page.includes(
      `{ id: '${sheet}', label:`
    ),
    `Primary workbook sheet ${sheet} is present.`,
  );
}

for (const sheet of [
  'bills',
  'members',
  'chat',
  'activity',
  'settings',
]) {
  check(
    page.includes(
      `{ id: '${sheet}', label:`
    ),
    `Support sheet ${sheet} remains inside the workbook.`,
  );
}

check(
  page.includes(
    'chooseTripWorkbookSheet('
  )
  && page.includes(
    "{ sheet },\n      { replace: true },"
  ),
  'Sheet changes happen in-place without module-style navigation history.',
);

check(
  page.includes(
    "tripWorkbookSheet\n              === 'members'"
  )
  && page.includes(
    "tripWorkbookSheet\n              === 'chat'"
  )
  && page.includes(
    "tripWorkbookSheet\n              === 'settings'"
  ),
  'Support tools render in the same worksheet body.',
);

check(
  !centre.includes(
    'onOpenSheet'
  )
  && !centre.includes(
    '<th>Action</th>'
  ),
  'Overview relies on workbook tabs instead of duplicate Open controls.',
);

check(
  css.includes(
    'BAJETBN V115 TRUE TRIP WORKBOOK'
  )
  && css.includes(
    '.trip-workbook-shell-v115'
  )
  && css.includes(
    '.trip-workbook-tabs-v115 button.active'
  )
  && css.includes(
    '.trip-workbook-sheet-body-v115'
  ),
  'True workbook frame styling remains installed.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRUE TRIP WORKBOOK: PASS',
);
