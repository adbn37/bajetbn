import fs from 'node:fs';

const page =
  fs.readFileSync(
    'src/features/spaces/SpaceDetailsPage.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

function check(value, label) {
  if (!value) {
    throw new Error('FAIL: ' + label);
  }
  console.log('PASS: ' + label);
}

check(
  page.includes("const TripCommandCentre = lazy(")
  && page.includes("import('./TripCommandCentre')"),
  'SpaceDetails lazy-loads TripCommandCentre.',
);

check(
  page.includes("const shouldLoadTripHomeData =")
  && page.includes("nextSpace.type === 'trip'"),
  'Trip overview still has a dedicated data-loading path.',
);

check(
  page.includes('listBudgetsForSpace(')
  && page.includes('listSharedExpenses(')
  && page.includes('setBudgets(')
  && page.includes('setSharedExpenses('),
  'Trip overview loads Budget and Trip Expense datasets.',
);

check(
  page.includes('type TripWorkbookSheet =')
  && page.includes('tripWorkbookSheetFromSearch(')
  && page.includes('const tripWorkbookActive ='),
  'Trip routing is driven by workbook sheet state.',
);

check(
  page.includes('data-trip-workbook')
  && page.includes('data-trip-sheet='),
  'Trip renders one persistent workbook workspace.',
);

check(
  page.includes('showPlanning={false}')
  && page.includes("tripWorkbookSheet === 'overview'"),
  'Overview stands alone instead of embedding Trip Plan.',
);

check(
  page.includes("tripWorkbookSheet === 'itinerary'")
  && page.includes("tripWorkbookSheet === 'tasks'")
  && page.includes("tripWorkbookSheet === 'bookings'"),
  'Planning sheets render inside the workbook.',
);

check(
  page.includes("tripWorkbookSheet === 'budget'")
  && page.includes("tripWorkbookSheet === 'expenses'")
  && page.includes("tripWorkbookSheet === 'fund'")
  && page.includes("tripWorkbookSheet === 'settle'"),
  'Financial Trip sheets render inside the workbook.',
);

check(
  page.includes("space.type !== 'trip'\n      && (!compactActionHome"),
  'Generic Space tab strip is hidden for Trip.',
);

check(
  page.includes(') : tripWorkbookActive ? null : space.type'),
  'Legacy Trip tab content is suppressed when workbook handles it.',
);

console.log('');
console.log('BAJETBN v1.15.0 TRIP HOME ROUTE: PASS');
