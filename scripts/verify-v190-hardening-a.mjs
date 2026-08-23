import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const functions =
  read('functions/src/index.ts');

const storage =
  read('storage.rules');

const avatar =
  read(
    'src/features/spaces/SpaceAvatarSettings.tsx',
  );

const checks = [
  [
    functions,
    '.limit(240)',
    'subscription expiry batch below write ceiling',
  ],
  [
    functions,
    'Each expiry can write both the user',
    'expiry batch rationale',
  ],
  [
    functions,
    ".doc(commandId(uid, key))",
    'Debt deterministic idempotent record',
  ],
  [
    functions,
    'const activeMember =',
    'Debt active Space membership',
  ],
  [
    functions,
    'const ownsSpace =',
    'Debt Space owner fallback',
  ],
  [
    functions,
    'transaction.create(\n          debtRef,',
    'Debt transaction create',
  ],
  [
    storage,
    'allow read: if isSpaceOwner(spaceId)',
    'avatar owner can read',
  ],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);

  if (!ok) failed += 1;
}

if (avatar.includes('capture="environment"')) {
  console.log(
    'FAIL avatar still forces rear camera',
  );
  failed += 1;
} else {
  console.log(
    'PASS avatar camera/photo-library chooser',
  );
}

const voidStart =
  functions.indexOf(
    'export const voidSmePosSale = onCall',
  );

const voidEnd =
  functions.indexOf(
    'export const setSpaceAvatar = onCall',
    voidStart,
  );

const voidText =
  functions.slice(voidStart, voidEnd);

const paymentReadPosition =
  voidText.indexOf(
    'await postSmePosPayments({',
  );

const itemMutationPosition =
  voidText.indexOf(
    'const updatedItems = items.map',
  );

if (
  paymentReadPosition >= 0
  && itemMutationPosition >= 0
  && paymentReadPosition < itemMutationPosition
) {
  console.log(
    'PASS POS void payment posting occurs before item writes',
  );
} else {
  console.log(
    'FAIL POS void payment posting still occurs after item writes',
  );
  failed += 1;
}

const originalPaymentsCount =
  (
    voidText.match(
      /const originalPayments: DocumentData\[\]/g,
    )
    || []
  ).length;

if (originalPaymentsCount === 1) {
  console.log(
    'PASS POS void payment block is unique',
  );
} else {
  console.log(
    `FAIL POS void payment block count ${originalPaymentsCount}`,
  );
  failed += 1;
}

if (failed) {
  console.error(
    `v1.9.0 Hardening A failed: ${failed}`,
  );
  process.exit(1);
}

console.log(
  'v1.9.0 Hardening A verifier: PASS',
);
