import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');
const page =
  read('src/features/spaces/SpaceDetailsPage.tsx');
const planning =
  read('src/features/spaces/TripPlanningPanel.tsx');
const centre =
  read('src/features/spaces/TripCommandCentre.tsx');
const css =
  read('src/styles/global.css');

function check(value, label) {
  if (!value) {
    throw new Error('FAIL: ' + label);
  }
  console.log('PASS: ' + label);
}

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
    hub.includes(`?sheet=${sheet}`),
    `Trip workbook exposes ${sheet} as a primary sheet.`,
  );
}

check(
  hub.includes('data-trip-workbook-tabs=')
  && hub.includes('tripSupportActive'),
  'Trip launcher is a workbook tab strip with More support state.',
);

for (const support of [
  '?tab=bills',
  '?tab=members',
  '?tab=chat',
  '?tab=activity',
  '?tab=settings',
]) {
  check(
    hub.includes(support),
    `Trip More keeps ${support.slice(5)} support access.`,
  );
}

check(
  page.includes('data-trip-workbook')
  && page.includes("tripWorkbookSheet === 'budget'")
  && page.includes("tripWorkbookSheet === 'expenses'"),
  'Selected workbook sheets render in the same Trip workspace.',
);

check(
  planning.includes("initialView = 'itinerary'")
  && planning.includes('setPlanningView(initialView);'),
  'Trip Plan can open directly to Itinerary, Tasks or Bookings.',
);

check(
  centre.includes('showPlanning = true')
  && centre.includes('{showPlanning && ('),
  'Overview can omit embedded planning when used as workbook sheet.',
);

check(
  css.includes('BAJETBN V115 TRIP WORKBOOK SHELL')
  && css.includes('max-width: 1600px;')
  && css.includes("data-trip-workbook-tabs='true'"),
  'Trip workbook receives wider spreadsheet workspace and tab styling.',
);

check(
  css.includes('.trip-workbook-v115')
  && css.includes('.trip-planning-tabs')
  && css.includes('display: none;'),
  'Nested Trip Plan tabs are hidden inside workbook sheets.',
);

console.log('');
console.log('BAJETBN v1.15.0 TRIP WORKBOOK SHELL: PASS');
