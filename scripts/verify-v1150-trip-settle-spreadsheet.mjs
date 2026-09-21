import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const panel =
  read(
    'src/features/spaces/SharedExpensesPanel.tsx',
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
    "view === 'balances' && space.type === 'trip'"
  )
  && panel.includes(
    'data-trip-settle-spreadsheet'
  ),
  'Trip Settle Up has a Trip-only spreadsheet branch.',
);

for (const heading of [
  'From',
  'To',
  'Expenses',
  'Amount',
  'Action',
]) {
  check(
    panel.includes(
      `<th>${heading}</th>`
    ),
    `Open balances worksheet includes ${heading} column.`,
  );
}

for (const heading of [
  'Date',
  'Status',
  'Proof',
  'Actions',
]) {
  check(
    panel.includes(
      `<th>${heading}</th>`
    ),
    `Payment history worksheet includes ${heading} column.`,
  );
}

check(
  panel.includes(
    'setPaying({'
  )
  && panel.includes(
    '<SharedExpensePaymentForm'
  ),
  'Trip Settle Up keeps the existing member payment workflow.',
);

check(
  panel.includes(
    'reviewSharedExpensePayment'
  )
  && panel.includes(
    'runUndoPayment'
  ),
  'Trip Settle Up keeps approval, decline and undo workflows.',
);

check(
  panel.includes(
    'getSharedExpenseProofUrl'
  )
  && panel.includes(
    'View proof'
  ),
  'Trip Settle Up keeps payment proof viewing.',
);

check(
  panel.includes(
    "if (view === 'balances') {"
  ),
  'Non-Trip settlement view remains available.',
);

check(
  css.includes(
    '/* v1.15.0 Trip Settle Up spreadsheet */'
  )
  && css.includes(
    '.trip-settle-payment-table'
  ),
  'Trip Settle Up spreadsheet styling is installed.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP SETTLE UP SPREADSHEET: PASS',
);
