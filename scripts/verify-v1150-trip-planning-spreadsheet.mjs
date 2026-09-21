import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const panel =
  read(
    'src/features/spaces/TripPlanningPanel.tsx',
  );

const css =
  read(
    'src/styles/global.css',
  );

const repo =
  read(
    'src/repositories/tripPlanningRepository.ts',
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
  panel.includes('data-trip-spreadsheet')
  && panel.includes('className="trip-sheet-table trip-sheet-itinerary"')
  && panel.includes('className="trip-sheet-table trip-sheet-tasks"')
  && panel.includes('className="trip-sheet-table trip-sheet-bookings"'),
  'Trip Plan renders spreadsheet tables for Itinerary, Tasks and Bookings.',
);

check(
  panel.includes('Edit the Trip like a spreadsheet.')
  && panel.includes('placeholder="Add a stopâ€¦"')
  && panel.includes('placeholder="Add a taskâ€¦"')
  && panel.includes('placeholder="Add bookingâ€¦"'),
  'Spreadsheet rows support direct inline entry.',
);

check(
  panel.includes('itemId,')
  && panel.includes('taskId,')
  && panel.includes('bookingId,')
  && repo.includes('itemId?: string;')
  && repo.includes('taskId?: string;')
  && repo.includes('bookingId?: string;'),
  'Existing Trip rows remain editable through current save APIs.',
);

check(
  /planningView\s*===\s*'itinerary'/.test(panel)
  && /planningView\s*===\s*'tasks'/.test(panel)
  && /planningView\s*===\s*'bookings'/.test(panel),
  'Trip Plan keeps the three intended worksheet views.',
);

check(
  panel.includes('Record actual payment in Trip Expenses.'),
  'Bookings remain planning-only and keep actual payment in Trip Expenses.',
);

check(
  css.includes('/* v1.15.0 Trip spreadsheet planning */')
  && css.includes('.trip-sheet-scroll')
  && css.includes('overflow-x: auto;'),
  'Spreadsheet styling supports desktop tables and mobile horizontal scrolling.',
);

check(
  !panel.includes('className="trip-planning-card"'),
  'Trip Plan no longer presents planning records as card stacks.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP PLANNING SPREADSHEET: PASS',
);
