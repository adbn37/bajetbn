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
  'Trip overview remains a spreadsheet worksheet.',
);

for (const heading of [
  'Area',
  'Target / Plan',
  'Collected / Spent',
  'Available / Left',
  'Status',
]) {
  check(
    centre.includes(
      `<th>${heading}</th>`
    ),
    `Trip money overview includes ${heading} column.`,
  );
}

check(
  !centre.includes(
    '<th>Action</th>'
  )
  && !centre.includes(
    'onOpenSheet'
  )
  && !centre.includes(
    '>Open<'
  ),
  'Overview no longer duplicates workbook navigation with Open actions.',
);

check(
  centre.includes(
    'Trip Money'
  )
  && centre.includes(
    'Trip Budget'
  )
  && centre.includes(
    'Trip Expenses'
  )
  && centre.includes(
    'Trip Members'
  )
  && centre.includes(
    'Settle Up'
  ),
  'Overview still covers core Trip money and people status.',
);

check(
  centre.includes(
    'trip-overview-attention-v115'
  )
  && !centre.includes(
    'trip-command-guidance'
  ),
  'Multiple setup cards are replaced by one compact needs-setup line.',
);

check(
  centre.includes(
    '<strong>Budget note:</strong>'
  )
  && centre.includes(
    'Trip Expenses are not linked to Budget yet.'
  ),
  'Budget accuracy limitation remains visible in compact form.',
);

check(
  css.includes(
    'BAJETBN V115 TRIP DESKTOP USABILITY POLISH'
  )
  && css.includes(
    '.trip-overview-attention-v115'
  ),
  'Desktop usability styling is installed.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP OVERVIEW CLEANUP: PASS',
);
