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
  'Trip Home has a dedicated data-loading path.',
);

check(
  page.includes(
    'listBudgetsForSpace('
  )
  && page.includes(
    'listSharedExpenses('
  )
  && page.includes(
    'setBudgets('
  )
  && page.includes(
    'setSharedExpenses('
  ),
  'Trip Home loads Budget and Trip Expense datasets.',
);

check(
  page.includes(
    "&& nextSpace.type !== 'trip'"
  ),
  'Generic compact Home loader excludes Trip.',
);

check(
  page.includes(
    "space.type === 'trip'\n      && !requestedSection\n      && !detailedOverviewRequested\n      && (\n        <TripCommandCentre"
  ),
  'Plain Trip Home renders TripCommandCentre.',
);

check(
  page.includes(
    "&& space.type !== 'trip'\n      && !requestedSection"
  ),
  'Generic SpaceHomeOverview render excludes Trip.',
);

check(
  page.includes(
    "space.type === 'trip'\n            && !requestedSection\n            && !detailedOverviewRequested"
  ),
  'Old SpaceOverview is suppressed under plain Trip Home.',
);

check(
  page.includes(
    'budgets={budgets}'
  )
  && page.includes(
    'sharedExpenses={sharedExpenses}'
  )
  && page.includes(
    'onOpenTab={chooseTab}'
  ),
  'TripCommandCentre receives live Trip data and navigation.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP HOME ROUTE: PASS',
);