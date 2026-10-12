import fs from 'node:fs';

const business =
  fs.readFileSync(
    'src/features/business/BusinessMoneyActivityPage.tsx',
    'utf8',
  );

const repository =
  fs.readFileSync(
    'src/repositories/spaceRepository.ts',
    'utf8',
  );

const checks = [
  [
    !business.includes(
      'accessibleSpaces',
    ),
    'Temporary v1.21 accessibleSpaces fallback is removed.',
  ],

  [
    !business.includes(
      'Legacy / owner Business Spaces may be',
    ),
    'Legacy fallback explanation is removed.',
  ],

  [
    /const activeBusinessSpaces\s*=\s*listedSpaces\s*\.filter/
      .test(business),
    'Business picker derives directly from canonical listSpaces output.',
  ],

  [
    !/\?\s*listedSpaces\s*:\s*\[\s*nextSpace[\s\S]*?\.\.\.listedSpaces/
      .test(business),
    'Current Business is no longer manually injected into the Space list.',
  ],

  [
    /export async function listSpaces[\s\S]*?await\s+ensureOwnedSpaceMembershipsRepaired\(\s*uid\s*,?\s*\);/
      .test(repository),
    'Canonical Space listing still repairs owner memberships first.',
  ],

  [
    /export async function getSpace[\s\S]*?await\s+ensureOwnedSpaceMembershipsRepaired\(\s*\);/
      .test(repository),
    'Direct Space loading still repairs owner memberships first.',
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
  '\nBAJETBN v122 BUSINESS SPACE CANONICALIZATION VERIFICATION PASS',
);
