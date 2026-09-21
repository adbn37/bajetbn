import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const sheet =
  read(
    'src/features/spaces/TripExpensesSpreadsheet.tsx',
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
    'data-trip-expenses-spreadsheet'
  )
  && sheet.includes(
    'className="trip-sheet-table trip-expenses-sheet-table"'
  ),
  'Trip Expenses renders as a spreadsheet worksheet.',
);

for (const heading of [
  'Description',
  'Split',
  'People',
  'Per Person',
  'Amount',
  'Paid By',
  'Paid From',
  'Date',
  'Settled',
  'Left',
]) {
  check(
    sheet.includes(
      `<th>${heading}</th>`
    ),
    `Trip Expenses includes ${heading} column.`,
  );
}

check(
  sheet.includes(
    "value=\"equal\""
  )
  && sheet.includes(
    "value=\"custom\""
  )
  && sheet.includes(
    "value=\"percentage\""
  ),
  'Trip Expenses keeps equal, custom and percentage split modes.',
);

check(
  sheet.includes(
    '<PeoplePicker'
  )
  && sheet.includes(
    'selectedMembers'
  ),
  'Trip Expenses lets the user choose who shares a new expense.',
);

check(
  sheet.includes(
    'createSharedExpense'
  )
  && sheet.includes(
    'listSharedExpenseShares'
  )
  && sheet.includes(
    'paidFromGroupFund:'
  ),
  'Trip Expenses reuses current shared-expense and Trip-money persistence.',
);

check(
  sheet.includes(
    'Use Settle Up for repayments and payment proofs.'
  ),
  'Settlement and proof workflow remains delegated to Settle Up.',
);

check(
  details.includes(
    "import('./TripExpensesSpreadsheet')"
  )
  && details.includes(
    '<TripExpensesSpreadsheet'
  ),
  'Trip Expenses route uses the spreadsheet component.',
);

check(
  details.includes(
    'view="balances"'
  ),
  'Existing Settle Up panel remains available.',
);

check(
  css.includes(
    '/* v1.15.0 Trip Expenses spreadsheet */'
  )
  && css.includes(
    '.trip-expenses-sheet-table'
  ),
  'Trip Expenses spreadsheet styling is installed.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP EXPENSES SPREADSHEET: PASS',
);
