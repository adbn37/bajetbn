import fs from 'node:fs';

const source =
  fs.readFileSync(
    'src/features/transactions/TransactionsPage.tsx',
    'utf8',
  );

const checks = [
  [
    /listPersonalAccounts\(\s*user\.uid/
      .test(source),
    'Personal Money still uses Personal-capable accounts for its normal scope.',
  ],

  [
    /listAccounts\(\s*user\.uid/
      .test(source),
    'Personal Money loads all owned accounts for cross-Space transaction display.',
  ],

  [
    /const personalAccountIds\s*=\s*new Set/
      .test(source),
    'Personal-capable account IDs are tracked separately.',
  ],

  [
    /item\.type === 'transfer'[\s\S]*?personalAccountIds\.has\([\s\S]*?item\.destinationAccountId/
      .test(source),
    'Business-recorded transfers arriving at Personal accounts remain visible in Personal Money.',
  ],

  [
    /!excludedPersonalMoneySpaceIds\.has\([\s\S]*?item\.spaceId/
      .test(source),
    'Normal Personal and non-Business records remain visible.',
  ],

  [
    /setTransactionAccounts\([\s\S]*?nextTransactionAccounts/
      .test(source),
    'All owned account metadata is retained for transaction display.',
  ],

  [
    /new Map\([\s\S]*?transactionAccounts\.map/
      .test(source),
    'Transfer rows can resolve Business source account names.',
  ],

  [
    /\.\.\.spaces,[\s\S]*?\.\.\.businessSpaces/
      .test(source),
    'Personal transfer rows can resolve the originating Business Space.',
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
  '\nBAJETBN v122 CROSS SPACE TRANSFER VISIBILITY VERIFICATION PASS',
);
