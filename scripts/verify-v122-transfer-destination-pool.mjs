import fs from 'node:fs';

const business =
  fs.readFileSync(
    'src/features/business/BusinessMoneyActivityPage.tsx',
    'utf8',
  );

const transactions =
  fs.readFileSync(
    'src/features/transactions/TransactionsPage.tsx',
    'utf8',
  );

const checks = [
  [
    /listAccounts\(\s*user\.uid/
      .test(business),
    'Business money entry loads all active owned accounts.',
  ],

  [
    !business.includes(
      'listPersonalAccounts',
    ),
    'Business money entry no longer limits destinations to Personal-enabled accounts.',
  ],

  [
    business.includes(
      'const canonicalBusinessLinks',
    ),
    'Business source linkage remains canonical and Space-scoped.',
  ],

  [
    /const transferDestinationOptions\s*=\s*accounts\.filter/
      .test(transactions),
    'Transfer destination pool uses the full modal account set.',
  ],

  [
    /account\.currency === sourceAccount\.currency/
      .test(transactions)
    && /account\.ownerId === sourceAccount\.ownerId/
      .test(transactions),
    'Transfer destinations remain same-currency and same-Account-Owner.',
  ],

  [
    /compatibleAccounts\.length >= 1[\s\S]*?transferDestinationOptions\.length >= 1/
      .test(transactions),
    'A Business with one valid source can still transfer to another owned account.',
  ],

  [
    /transferDestinationOptions\.length === 0/
      .test(transactions),
    'Move Money submit button uses destination availability instead of requiring two source-Space accounts.',
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
  '\nBAJETBN v122 TRANSFER DESTINATION POOL VERIFICATION PASS',
);
