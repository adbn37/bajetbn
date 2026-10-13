import fs from 'node:fs';

const source =
  fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const start =
  source.indexOf(
    'export const postTransaction =',
  );

const end =
  source.indexOf(
    'export const getFinancialApprovalRequests =',
    start,
  );

const directPost =
  source.slice(
    start,
    end > start
      ? end
      : source.length,
  );

const checks = [
  [
    /const account = await assertAccountForSpaceActor/
      .test(directPost),
    'Move Money source remains validated against the selected Space.',
  ],

  [
    /type === 'transfer'[\s\S]*?assertAccount\([\s\S]*?destinationSnapshot\.data\(\)[\s\S]*?account\.ownerId/
      .test(directPost),
    'Direct transfer destination is validated by Account Owner instead of source Space.',
  ],

  [
    /destination && destination\.ownerId !== account\.ownerId/
      .test(directPost),
    'Direct cross-Space transfers remain same-Account-Owner.',
  ],

  [
    /destination && destination\.currency !== account\.currency/
      .test(directPost),
    'Direct cross-Space transfers remain same-currency.',
  ],

  [
    /destinationAccountId && destinationAccountId === accountId/
      .test(directPost),
    'Direct transfers still reject identical source and destination accounts.',
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
  '\nBAJETBN v122 DIRECT CROSS SPACE TRANSFER VERIFICATION PASS',
);
