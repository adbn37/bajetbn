import fs from 'node:fs';

const page =
  fs.readFileSync(
    'src/features/spaces/SpaceDetailsPage.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

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
    "const TripCommandCentre = lazy("
  )
  && page.includes(
    "import('./TripCommandCentre')"
  ),
  'SpaceDetails lazy-loads TripCommandCentre.',
);

check(
  page.includes(
    "const shouldLoadTripHomeData ="
  )
  && page.includes(
    "nextSpace.type === 'trip'"
  ),
  'Trip workbook keeps its dedicated lightweight data path.',
);

check(
  page.includes(
    'listBudgetsForSpace('
  )
  && page.includes(
    'listSharedExpenses('
  ),
  'Trip workbook can load Budget and Trip Expense datasets.',
);

check(
  page.includes(
    'type TripWorkbookSheet ='
  )
  && page.includes(
    'tripWorkbookSheetFromSearch('
  ),
  'Trip routes resolve to workbook sheet state.',
);

check(
  page.includes(
    'data-trip-workbook-shell'
  )
  && page.includes(
    'data-trip-workbook'
  ),
  'Trip route renders the persistent workbook shell and worksheet body.',
);

check(
  page.includes(
    "space.type !== 'trip'\n      && (\n      <SpaceActionHub"
  ),
  'Generic SpaceActionHub is excluded from Trip.',
);

check(
  page.includes(
    "space.type !== 'trip'\n      && (!compactActionHome"
  ),
  'Generic Space tabs remain excluded from Trip.',
);

check(
  page.includes(
    ') : tripWorkbookActive ? null : space.type'
  ),
  'Legacy shared module renderer stays suppressed for Trip.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP HOME ROUTE: PASS',
);
