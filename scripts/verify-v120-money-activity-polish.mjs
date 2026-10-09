import fs from 'node:fs';

const fail = (message) => {
  throw new Error(message);
};

const personal = fs.readFileSync(
  'src/features/transactions/TransactionsPage.tsx',
  'utf8',
);

const business = fs.readFileSync(
  'src/features/business/BusinessMoneyActivityPage.tsx',
  'utf8',
);

const styles = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

for (const expected of [
  'const activeFilterCount',
  'const resetFilters',
  'Reset filters ({activeFilterCount})',
  '{visibleTransactions.length}',
  '{transactions.length}',
  'statusLabels[item.status]',
  'item.transactionDate',
  'formatMoney(',
]) {
  if (!personal.includes(expected)) {
    fail(
      'Personal Money Activity polish is missing: '
      + expected,
    );
  }
}

for (const expected of [
  'const activeFilterCount',
  'const resetFilters',
  'Reset filters ({activeFilterCount})',
  '{sortedRows.length}',
  '{transactions.length}',
  'sourceName',
  'destinationName',
  'statusLabels[item.status]',
  'item.transactionDate',
  'accountMap,',
]) {
  if (!business.includes(expected)) {
    fail(
      'Business Money Activity polish is missing: '
      + expected,
    );
  }
}

if (
  !styles.includes(
    '.transaction-filter-status {',
  )
) {
  fail(
    'Money Activity filter status styling is missing.',
  );
}

for (const [label, source] of [
  ['Personal', personal],
  ['Business', business],
]) {
  if (
    !source.includes(
      'transaction-advanced-filters',
    )
  ) {
    fail(
      label
      + ' Mobile advanced Money Activity filters are missing.',
    );
  }

  if (
    !source.includes(
      '<span>More filters</span>',
    )
  ) {
    fail(
      label
      + ' Mobile filter summary is missing.',
    );
  }
}

if (
  !styles.includes(
    'BAJETBN V1.20 MOBILE MONEY FILTERS',
  )
  || !styles.includes(
    '.transaction-advanced-filters:not([open])',
  )
) {
  fail(
    'Mobile Money Activity filter collapse styling is missing.',
  );
}

console.log(
  'BAJETBN v120 MONEY ACTIVITY POLISH VERIFICATION PASS',
);
