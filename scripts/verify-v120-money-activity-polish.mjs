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

for (const [label, source] of [
  ['Personal', personal],
  ['Business', business],
]) {
  for (const expected of [
    'function activityKindLabel(',
    'function activityStatusLabel(',
    'transaction-kind-badge',
    'const isTransferFlow',
    'transaction-route',
    '<b>to</b>',
    'activityStatusLabel(item)',
  ]) {
    if (!source.includes(expected)) {
      fail(
        label
        + ' Transaction row clarity is missing: '
        + expected,
      );
    }
  }
}

for (const expected of [
  'BAJETBN V1.20 TRANSACTION ROW CLARITY',
  '.transaction-kind-badge.transfer',
  '.transaction-kind-badge.reversal',
  '.transaction-route {',
  '.status-badge.reversal',
]) {
  if (!styles.includes(expected)) {
    fail(
      'Transaction row clarity styling is missing: '
      + expected,
    );
  }
}

for (const expected of [
  'const personalSummaryRows =',
  'const personalSummaryByCurrency =',
  'const personalSummaryCurrencies =',
  'const personalTransferCount =',
  'Top categories in this view',
  'category-summary-currency',
  'Currencies stay separate',
]) {
  if (!personal.includes(expected)) {
    fail(
      'Personal Summary integrity is missing: '
      + expected,
    );
  }
}

if (
  personal.includes(
    "formatMoney(income, profile?.currency",
  )
  || personal.includes(
    "formatMoney(expenses, profile?.currency",
  )
) {
  fail(
    'Personal summary still combines unlike currencies.',
  );
}

for (const expected of [
  'const summaryRows =',
  'visibleRows.filter(',
  "' - filtered'",
]) {
  if (!business.includes(expected)) {
    fail(
      'Business Summary integrity is missing: '
      + expected,
    );
  }
}

for (const expected of [
  'BAJETBN V1.20 SUMMARY INTEGRITY',
  '.transaction-summary-values {',
  '.category-summary-currency',
]) {
  if (!styles.includes(expected)) {
    fail(
      'Summary integrity styling is missing: '
      + expected,
    );
  }
}


for (const [label, source] of [
  ['Personal', personal],
  ['Business', business],
]) {
  for (const expected of [
    'formatTransactionAuditTime(',
    'Record history',
    'transaction-audit',
    'activityStatusClass(item)',
    'activityStatusLabel(item)',
    'Undo relationship',
    'item.displayId || item.id',
    'Account route',
  ]) {
    if (!source.includes(expected)) {
      fail(
        label
        + ' Transaction detail audit is missing: '
        + expected,
      );
    }
  }
}

if (
  !business.includes(
    'spaceName={space.name}',
  )
  || !business.includes(
    '<dt>Business Space</dt>',
  )
) {
  fail(
    'Business transaction details are missing Business Space context.',
  );
}

for (const expected of [
  'BAJETBN V1.20 TRANSACTION DETAIL AUDIT',
  '.transaction-audit {',
  '.transaction-audit-heading {',
  '.transaction-audit-list {',
  '.transaction-audit-note {',
]) {
  if (!styles.includes(expected)) {
    fail(
      'Transaction detail audit styling is missing: '
      + expected,
    );
  }
}

console.log(
  'BAJETBN v120 MONEY ACTIVITY POLISH VERIFICATION PASS',
);
