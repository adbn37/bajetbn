import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const budget =
  read(
    'src/features/spaces/TripBudgetSpreadsheet.tsx',
  );

const overview =
  read(
    'src/features/spaces/TripCommandCentre.tsx',
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
  !budget.includes(
    'Spending updates automatically from saved expenses.'
  ),
  'Trip Budget no longer claims saved Trip Expenses update Spent.',
);

check(
  budget.includes(
    'Trip Expenses are not included yet.'
  ),
  'Trip Budget clearly states Trip Expenses are not included in Spent yet.',
);

check(
  budget.includes(
    'posted Money Activity transactions'
  )
  && budget.includes(
    'trip-budget-spend-source-note'
  ),
  'Trip Budget explains the current Spent source.',
);

check(
  overview.includes(
    'Money Activity only'
  ),
  'Trip Overview identifies the current Budget tracking source.',
);

check(
  overview.includes(
    'Trip Budget Spent does not include Trip Expenses yet.'
  )
  && overview.includes(
    'trip-overview-budget-source-note'
  ),
  'Trip Overview carries the same Budget limitation clearly.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP BUDGET SPENDING ACCURACY: PASS',
);