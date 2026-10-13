import fs from 'node:fs';

const source =
  fs.readFileSync(
    'src/features/transactions/TransactionsPage.tsx',
    'utf8',
  );

const checks = [
  [
    /function accountContextLabel\(/.test(source),
    'Money Activity has a reusable account context label.',
  ],
  [
    /accountSupportsPersonalUse\([\s\S]*?contexts\.push\('Personal'\)/
      .test(source),
    'Personal-capable accounts are labelled Personal.',
  ],
  [
    /businessSpaceIdsForAccount\([\s\S]*?space\.type === 'sme'/
      .test(source),
    'Business account labels resolve canonical Business Spaces.',
  ],
  [
    /return contexts\.join\(' \+ '\)/
      .test(source),
    'Multi-context accounts retain every valid context.',
  ],
  [
    /accountContextLabel\([\s\S]*?sourceAccount,[\s\S]*?spaces/
      .test(source),
    'Selected source account shows its context.',
  ],
  [
    /accountContextLabel\([\s\S]*?destinationAccount,[\s\S]*?spaces/
      .test(source),
    'Selected destination account shows its context.',
  ],
  [
    /\{accountContextLabel\(account, spaces\)\} · \{account\.name\}/
      .test(source),
    'Native account pickers show context before account name.',
  ],
];

let failed = false;

for (const [passed, message] of checks) {
  if (passed) {
    console.log(`PASS: ${message}`);
  } else {
    failed = true;
    console.error(`FAIL: ${message}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  '\nBAJETBN v123 MONEY ACCOUNT CONTEXT VERIFICATION PASS',
);
