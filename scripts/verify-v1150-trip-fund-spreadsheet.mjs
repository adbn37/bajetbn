import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const panel =
  read(
    'src/features/spaces/SpaceFundPanel.tsx',
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
  panel.includes(
    "if (space.type === 'trip')"
  )
  && panel.includes(
    'data-trip-fund-spreadsheet'
  ),
  'Trip Money has a Trip-only spreadsheet branch.',
);

for (const heading of [
  'Target',
  'Collected',
  'Spent',
  'Available',
  'Holder',
  'Actions',
]) {
  check(
    panel.includes(
      `<th>${heading}</th>`
    ),
    `Trip Money summary includes ${heading} column.`,
  );
}

for (const heading of [
  'Date',
  'Member',
  'Amount',
  'Method',
  'Status',
  'Note',
]) {
  check(
    panel.includes(
      `<th>${heading}</th>`
    ),
    `Trip Money contributions include ${heading} column.`,
  );
}

check(
  panel.includes(
    '<SpaceFundSettingsForm'
  )
  && panel.includes(
    '<SpaceFundContributionForm'
  ),
  'Trip Money keeps existing setup and contribution forms.',
);

check(
  panel.includes(
    'runUndoContribution'
  )
  && panel.includes(
    'reverseSpaceFundContribution'
  ),
  'Trip Money keeps the existing undo workflow.',
);

check(
  panel.includes(
    'Trip Expenses marked as paid from Trip money reduce the Available amount automatically.'
  ),
  'Trip Money explains automatic Trip spending deduction.',
);

check(
  panel.includes(
    'return <section className="panel trip-money-panel space-fund-panel">'
  ),
  'Non-Trip fund presentation remains available.',
);

check(
  css.includes(
    '/* v1.15.0 Trip Money spreadsheet */'
  )
  && css.includes(
    '.trip-fund-contribution-table'
  ),
  'Trip Money spreadsheet styling is installed.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP MONEY SPREADSHEET: PASS',
);
