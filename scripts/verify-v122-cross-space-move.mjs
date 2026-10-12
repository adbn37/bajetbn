import fs from 'node:fs';

const source =
  fs.readFileSync(
    'src/features/transactions/TransactionsPage.tsx',
    'utf8',
  );

const checks = [
  [
    /const nextDestinationAccounts\s*=\s*type === 'transfer'[\s\S]*?\?\s*accounts\.filter/
      .test(source),
    'Transfer destination validation uses the full eligible account set.',
  ],

  [
    /const destinationOptions\s*=\s*type === 'transfer'[\s\S]*?\?\s*accounts\.filter/
      .test(source),
    'Move Money destination picker can use accounts outside the selected Space.',
  ],

  [
    /account\.id !== accountId/
      .test(source),
    'Move Money cannot select the source account as its destination.',
  ],

  [
    /account\.currency\s*===\s*(?:currentSourceAccount|sourceAccount)\.currency/
      .test(source),
    'Cross-Space Move Money remains same-currency.',
  ],

  [
    /account\.ownerId\s*===\s*(?:currentSourceAccount|sourceAccount)\.ownerId/
      .test(source),
    'Cross-Space Move Money remains same-Account-Owner.',
  ],

  [
    /!account\.archivedAt/
      .test(source)
    && /!account\.closedAt/
      .test(source)
    && /account\.sharedCanUseAccount !== false/
      .test(source),
    'Move Money excludes archived, closed, or unusable destination accounts.',
  ],

  [
    /const nextAccounts = accounts\.filter\([\s\S]*?accountAvailableInSelectedSpace\(account\)/
      .test(source),
    'Source account remains scoped to the selected Personal or Business context.',
  ],

  [
    /!nextDestinationAccounts\.some\([\s\S]*?account\.id === destinationAccountId/
      .test(source),
    'Destination validation no longer requires the destination to belong to the source Space.',
  ],
];

let failed = false;

for (
  const [passed, message]
  of checks
) {
  if (passed) {
    console.log(
      `PASS: ${message}`,
    );
  } else {
    failed = true;

    console.error(
      `FAIL: ${message}`,
    );
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  '\nBAJETBN v122 CROSS SPACE MOVE MONEY VERIFICATION PASS',
);
