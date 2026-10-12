import fs from 'node:fs';

const source =
  fs.readFileSync(
    'src/features/business/BusinessMoneyActivityPage.tsx',
    'utf8',
  );

const checks = [
  [
    source.includes(
      'const canonicalBusinessLinks',
    ),
    'Business money entry builds canonical account-to-Business links.',
  ],

  [
    /businessAccountGroups\.forEach\([\s\S]*?activeBusinessSpaces[\s\S]*?\[?\s*index\s*\]?\?\.id/
      .test(source),
    'Canonical Business links are derived from each authoritative Business account result.',
  ],

  [
    /listAccountsForSpace\([\s\S]*?businessSpace\.id/
      .test(source),
    'Business account membership comes from listAccountsForSpace.',
  ],

  [
    /businessSpaceIds:\s*\[\s*\.\.\.linkedIds\s*\]/
      .test(source),
    'Entry accounts receive only confirmed canonical Business Space links.',
  ],

  [
    /account\.classification === 'business'[\s\S]*?businessSpaceIds:\s*\[\][\s\S]*?spaceId:\s*null/
      .test(source),
    'Legacy Business links are stripped from Personal-loaded account copies.',
  ],

  [
    !/businessAccountGroups\s*\.flat\(\)\s*\.forEach/
      .test(source),
    'Business source accounts no longer trust the old flattened legacy merge.',
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
  '\nBAJETBN v122 BUSINESS SOURCE ACCOUNT VERIFICATION PASS',
);
