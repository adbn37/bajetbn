import fs from 'node:fs';

const fn =
  fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  );

const rules =
  fs.readFileSync(
    'firestore.rules',
    'utf8',
  );

const checks = [
  [
    fn,
    "collection('subscriptionCapacityLocks')",
    'capacity lock collection',
  ],
  [
    fn,
    'transaction.get(ownedSpacesQuery)',
    'owned Space query inside transaction',
  ],
  [
    fn,
    'transaction.get(capacityLockRef)',
    'capacity lock read inside transaction',
  ],
  [
    fn,
    'activeOfType >= allowance',
    'Basic Space limit rechecked transactionally',
  ],
  [
    fn,
    'version: lockVersion + 1',
    'capacity lock mutation',
  ],
  [
    rules,
    'match /subscriptionCapacityLocks/{lockId}',
    'client capacity lock access denied',
  ],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!ok) {
    failed += 1;
  }
}

const onboardingStart =
  fn.indexOf(
    'export const completeOnboarding',
  );

const onboardingEnd =
  fn.indexOf(
    'async function requireOwnedSmeSpaceForAccount',
    onboardingStart,
  );

const onboarding =
  fn.slice(
    onboardingStart,
    onboardingEnd,
  );

for (const [marker, label] of [
  ['db.runTransaction', 'onboarding transaction'],
  ["type: 'personal'", 'Personal Space creation'],
  ["role: 'owner'", 'Personal owner membership'],
  ['personalSpaceId', 'Personal Space profile link'],
]) {
  const ok =
    onboarding.includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!ok) {
    failed += 1;
  }
}

if (
  onboarding.includes(
    'subscriptionCapacityLocks'
  )
) {
  console.log(
    'FAIL onboarding incorrectly uses capacity lock',
  );

  failed += 1;
}
else {
  console.log(
    'PASS onboarding remains independent',
  );
}

if (failed > 0) {
  console.error(
    `Hardening B1 failed: ${failed}`,
  );

  process.exit(1);
}

console.log(
  'v1.9.0 Hardening B1 verifier: PASS',
);
