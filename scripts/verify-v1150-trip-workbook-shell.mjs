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
    'className="trip-workbook-sheet-body-v115"'
  )
  && page.includes(
    'className="trip-workbook-status-v115"'
  ),
  'Trip owns one persistent workbook frame around the active worksheet.',
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
  'Sheet changes happen in-place without creating module-style navigation history.',
);

check(
  page.includes(
    'tripWorkbookActive =\n    space.type ==='
  ),
  'Workbook frame stays active for the entire Trip Space.',
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
  centre.includes(
    'onOpenSheet'
  )
  && centre.includes(
    "onOpenSheet('budget')"
  )
  && centre.includes(
    "onOpenSheet('fund')"
  )
  && centre.includes(
    "onOpenSheet('expenses')"
  )
  && centre.includes(
    "onOpenSheet('settle')"
  ),
  'Overview actions switch workbook sheets instead of opening old modules.',
);

check(
  !centre.includes(
    'Budget sheet below'
  ),
  'Overview no longer describes Budget as a separate section below.',
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
  'True workbook frame styling is installed.',
);

check(
  css.includes(
    '> .panel'
  )
  && css.includes(
    'border-radius: 0;'
  ),
  'Module card chrome is stripped inside the workbook worksheet body.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRUE TRIP WORKBOOK: PASS',
);
