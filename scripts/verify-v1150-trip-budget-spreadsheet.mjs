import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const sheet =
  read(
    'src/features/spaces/TripBudgetSpreadsheet.tsx',
  );

const details =
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

check(
  sheet.includes(
    'data-trip-budget-spreadsheet'
  )
  && sheet.includes(
    'className="trip-sheet-table trip-budget-sheet-table"'
  ),
  'Trip Budget renders as a spreadsheet worksheet.',
);

for (const heading of [
  'Pot',
  'Category',
  'Budget',
  'People',
  'Per Person',
  'Spent',
  'Left',
  'Dates',
  'Actions',
]) {
  check(
    sheet.includes(
      `<th>${heading}</th>`
    ),
    `Trip Budget includes ${heading} column.`,
  );
}

check(
  sheet.includes(
    'People = all active Trip members for now.'
  )
  && sheet.includes(
    'Selecting different people per pot will be added separately'
  ),
  'Participant scope is explicit and does not pretend unsupported persistence.',
);

check(
  sheet.includes(
    'listBudgetsForSpace'
  )
  && sheet.includes(
    'createBudget'
  )
  && sheet.includes(
    'updateBudget'
  )
  && sheet.includes(
    'archiveBudget'
  ),
  'Trip Budget keeps existing real Budget persistence.',
);

check(
  details.includes(
    "import('./TripBudgetSpreadsheet')"
  )
  && details.includes(
    '<TripBudgetSpreadsheet'
  ),
  'Trip Space Budget route uses the spreadsheet component.',
);

check(
  details.includes(
    '<EmbeddedBudgetsPage'
  ),
  'Existing non-Trip Budget module remains available.',
);

check(
  css.includes(
    '/* v1.15.0 Trip Budget spreadsheet */'
  )
  && css.includes(
    '.trip-budget-sheet-table'
  ),
  'Trip Budget spreadsheet styling is installed.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP BUDGET SPREADSHEET: PASS',
);
