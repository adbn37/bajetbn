import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

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
  centre.includes(
    'data-trip-overview-spreadsheet'
  )
  && centre.includes(
    'trip-overview-money-table'
  ),
  'Trip overview renders as a spreadsheet worksheet.',
);

for (const heading of [
  'Area',
  'Target / Plan',
  'Collected / Spent',
  'Available / Left',
  'Status',
  'Action',
]) {
  check(
    centre.includes(
      `<th>${heading}</th>`
    ),
    `Trip money overview includes ${heading} column.`,
  );
}

check(
  centre.includes(
    'Trip Money'
  )
  && centre.includes(
    'Trip Budget'
  )
  && centre.includes(
    'Trip Expenses'
  ),
  'Trip overview covers Money, Budget and Expenses.',
);

check(
  centre.includes(
    "onOpenSheet('fund')"
  )
  && centre.includes(
    "onOpenSheet('budget')"
  )
  && centre.includes(
    "onOpenSheet('expenses')"
  )
  && centre.includes(
    "onOpenSheet('settle')"
  ),
  'Overview actions switch directly to workbook sheets.',
);

check(
  !centre.includes(
    'Budget sheet below'
  ),
  'Budget action no longer assumes an embedded module below Overview.',
);

check(
  css.includes(
    '/* v1.15.0 Trip Overview spreadsheet */'
  )
  && css.includes(
    '.trip-overview-money-table'
  ),
  'Trip overview spreadsheet styling remains installed.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP OVERVIEW SPREADSHEET: PASS',
);
