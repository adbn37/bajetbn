import assert from 'node:assert/strict';
import fs from 'node:fs';

const page =
  fs.readFileSync(
    'src/features/reports/ReportsPage.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const metrics =
  fs.readFileSync(
    'src/features/reports/reportingMetrics.ts',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const contract =
  fs.readFileSync(
    'FINANCE_REPORTING_FOUNDATION_ALPHA1.md',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const pkg =
  JSON.parse(
    fs.readFileSync(
      'package.json',
      'utf8',
    ),
  );

const release =
  JSON.parse(
    fs.readFileSync(
      'release.json',
      'utf8',
    ),
  );

assert.equal(
  pkg.version,
  '1.15.0',
);

assert.equal(
  release.version,
  '1.15.0',
);

assert.equal(
  release.label,
  'BajetBN v1.15.0',
);

for (
  const marker
  of [
    'export function mergeReportTransactions(',
    'export function isCashFlowReportTransaction(',
    'export function filterCashFlowReportTransactions(',
    'export function summarizeCashFlow(',
    'export function reportPostedAtMillis(',
    'export function reportTransactionCategoryKey(',
  ]
) {
  assert.equal(
    metrics.includes(
      marker,
    ),
    true,
    `Shared reporting metric missing: ${marker}`,
  );
}

for (
  const marker
  of [
    'filterCashFlowReportTransactions(',
    'mergeReportTransactions(',
    'summarizeCashFlow(',
    'reportTransactionCategoryKey(',
  ]
) {
  assert.equal(
    page.includes(
      marker,
    ),
    true,
    `Reports page has not migrated to shared metric: ${marker}`,
  );
}

assert.equal(
  page.includes(
    "item.status === 'posted'\n    && (item.type === 'income' || item.type === 'expense')",
  ),
  false,
  'Money Reports should not keep its old inline cash-flow inclusion rule.',
);

assert.equal(
  page.includes(
    "const moneyIn = filteredTransactions.filter((item) => item.type === 'income').reduce",
  ),
  false,
  'Money In must come from the shared cash-flow summary.',
);

assert.equal(
  page.includes(
    "const moneyOut = filteredTransactions.filter((item) => item.type === 'expense').reduce",
  ),
  false,
  'Money Out must come from the shared cash-flow summary.',
);

for (
  const marker
  of [
    'Transfers are excluded from Money In and Money Out.',
    'Reversed originals are excluded.',
    'Posted reversal records are excluded from basic cash-flow totals.',
    'Balances are not cash-flow metrics.',
    'Duplicate transaction IDs are counted once',
  ]
) {
  assert.equal(
    contract.includes(
      marker,
    ),
    true,
    `Foundation contract missing: ${marker}`,
  );
}

function timestampMillis(
  value,
) {
  if (
    value === null
    || value === undefined
  ) {
    return 0;
  }

  if (
    value instanceof Date
  ) {
    return value.getTime();
  }

  if (
    typeof value === 'number'
  ) {
    return Number.isFinite(
      value,
    )
      ? value
      : 0;
  }

  if (
    typeof value === 'string'
  ) {
    const parsed =
      Date.parse(
        value,
      );

    return Number.isNaN(
      parsed,
    )
      ? 0
      : parsed;
  }

  if (
    typeof value !== 'object'
  ) {
    return 0;
  }

  if (
    typeof value.toMillis
    === 'function'
  ) {
    return Number(
      value.toMillis(),
    ) || 0;
  }

  const seconds =
    Number(
      value.seconds
      ?? value._seconds,
    );

  if (
    !Number.isFinite(
      seconds,
    )
  ) {
    return 0;
  }

  const nanoseconds =
    Number(
      value.nanoseconds
      ?? value._nanoseconds
      ?? 0,
    );

  return (
    seconds * 1000
    + (
      Number.isFinite(
        nanoseconds,
      )
        ? Math.floor(
            nanoseconds
            / 1_000_000,
          )
        : 0
    )
  );
}

function categoryKey(
  item,
) {
  return (
    item.categoryId
    || `name:${(
      item.category
      || 'Other'
    ).toLowerCase()}`
  );
}

function include(
  item,
  filter,
) {
  return (
    item.status === 'posted'
    && (
      item.type === 'income'
      || item.type === 'expense'
    )
    && item.transactionDate
      >= filter.range.start
    && item.transactionDate
      <= filter.range.end
    && (
      !filter.spaceId
      || item.spaceId
        === filter.spaceId
    )
    && (
      !filter.accountId
      || item.accountId
        === filter.accountId
      || item.destinationAccountId
        === filter.accountId
    )
    && (
      !filter.categoryKey
      || categoryKey(
        item,
      ) === filter.categoryKey
    )
  );
}

function merge(
  ...lists
) {
  const byId =
    new Map();

  lists.forEach(
    (
      list,
    ) =>
      list.forEach(
        (
          item,
        ) =>
          byId.set(
            item.id,
            item,
          ),
      ),
  );

  return [
    ...byId.values(),
  ].sort(
    (
      a,
      b,
    ) => {
      const dateCompare =
        b.transactionDate.localeCompare(
          a.transactionDate,
        );

      if (
        dateCompare !== 0
      ) {
        return dateCompare;
      }

      return (
        timestampMillis(
          b.postedAt,
        )
        - timestampMillis(
          a.postedAt,
        )
      );
    },
  );
}

function summarize(
  items,
) {
  let moneyIn =
    0;

  let moneyOut =
    0;

  items.forEach(
    (
      item,
    ) => {
      if (
        item.status !== 'posted'
        || (
          item.type !== 'income'
          && item.type !== 'expense'
        )
      ) {
        return;
      }

      if (
        item.type === 'income'
      ) {
        moneyIn +=
          item.amountMinor;
      } else {
        moneyOut +=
          item.amountMinor;
      }
    },
  );

  return {
    moneyIn,
    moneyOut,
    netCashFlow:
      moneyIn
      - moneyOut,
  };
}

const personal =
  [
    {
      id: 'income-personal',
      status: 'posted',
      type: 'income',
      amountMinor: 100000,
      transactionDate: '2026-09-01',
      spaceId: 'personal',
      accountId: 'personal-bank',
      categoryId: 'salary',
      postedAt: {
        toMillis: () =>
          1_725_000_001_000,
      },
    },
    {
      id: 'expense-personal',
      status: 'posted',
      type: 'expense',
      amountMinor: 25000,
      transactionDate: '2026-09-02',
      spaceId: 'personal',
      accountId: 'personal-bank',
      category: 'Food',
      postedAt: {
        seconds:
          1_725_000_002,
        nanoseconds: 0,
      },
    },
    {
      id: 'transfer-personal',
      status: 'posted',
      type: 'transfer',
      amountMinor: 5000,
      transactionDate: '2026-09-03',
      spaceId: 'personal',
      accountId: 'personal-bank',
      destinationAccountId:
        'savings-bank',
      category: 'Transfer',
    },
    {
      id: 'reversed-expense',
      status: 'reversed',
      type: 'expense',
      amountMinor: 7000,
      transactionDate: '2026-09-04',
      spaceId: 'personal',
      accountId: 'personal-bank',
      category: 'Shopping',
    },
    {
      id: 'reversal-record',
      status: 'posted',
      type: 'reversal',
      amountMinor: 7000,
      transactionDate: '2026-09-04',
      spaceId: 'personal',
      accountId: 'personal-bank',
      category: 'Shopping',
    },
  ];

const business =
  [
    {
      id: 'income-business',
      status: 'posted',
      type: 'income',
      amountMinor: 40000,
      transactionDate: '2026-09-05',
      spaceId: 'business',
      accountId: 'business-bank',
      categoryId: 'sales',
      postedAt: {
        _seconds:
          1_725_000_005,
        _nanoseconds: 0,
      },
    },
    {
      id: 'expense-business',
      status: 'posted',
      type: 'expense',
      amountMinor: 10000,
      transactionDate: '2026-09-06',
      spaceId: 'business',
      accountId: 'business-bank',
      category: 'Supplies',
      postedAt:
        '2026-09-06T01:00:00Z',
    },
    {
      id: 'expense-business',
      status: 'posted',
      type: 'expense',
      amountMinor: 10000,
      transactionDate: '2026-09-06',
      spaceId: 'business',
      accountId: 'business-bank',
      category: 'Supplies',
      postedAt:
        '2026-09-06T01:00:00Z',
    },
  ];

const merged =
  merge(
    personal,
    business,
  );

assert.equal(
  merged.length,
  7,
  'Duplicate transaction IDs must be counted once.',
);

const September =
  merged.filter(
    (
      item,
    ) =>
      include(
        item,
        {
          range: {
            start:
              '2026-09-01',
            end:
              '2026-09-30',
          },
        },
      ),
  );

const summary =
  summarize(
    September,
  );

assert.deepEqual(
  summary,
  {
    moneyIn:
      140000,
    moneyOut:
      35000,
    netCashFlow:
      105000,
  },
  'Personal + Business cash-flow totals are incorrect.',
);

const personalOnly =
  September.filter(
    (
      item,
    ) =>
      include(
        item,
        {
          range: {
            start:
              '2026-09-01',
            end:
              '2026-09-30',
          },
          spaceId:
            'personal',
        },
      ),
  );

assert.deepEqual(
  summarize(
    personalOnly,
  ),
  {
    moneyIn:
      100000,
    moneyOut:
      25000,
    netCashFlow:
      75000,
  },
);

const foodOnly =
  September.filter(
    (
      item,
    ) =>
      include(
        item,
        {
          range: {
            start:
              '2026-09-01',
            end:
              '2026-09-30',
          },
          categoryKey:
            'name:food',
        },
      ),
  );

assert.equal(
  foodOnly.length,
  1,
);

assert.equal(
  timestampMillis(
    {
      seconds:
        1_725_000_123,
      nanoseconds:
        456_000_000,
    },
  ),
  1_725_000_123_456,
);

assert.equal(
  timestampMillis(
    {
      _seconds:
        1_725_000_123,
      _nanoseconds:
        456_000_000,
    },
  ),
  1_725_000_123_456,
);

console.log(
  'BajetBN v1.15.0 Finance & Reporting Foundation Alpha 1 verification PASS.',
);
