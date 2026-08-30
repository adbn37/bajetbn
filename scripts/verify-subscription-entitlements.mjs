import fs from 'node:fs';

const checks = [
  ['functions/src/index.ts', 'export const createSpaceWithEntitlement'],
  ['functions/src/index.ts', 'householdSpaces: 1'],
  ['functions/src/index.ts', 'tripSpaces: 1'],
  ['functions/src/index.ts', 'smeSpaces: 1'],
  ['functions/src/index.ts', 'smeInventoryItems: 20'],
  ['functions/src/index.ts', 'smeCustomers: 10'],
  ['functions/src/index.ts', 'smeSellers: 3'],
  ['functions/src/index.ts', 'smeAdditionalMembers: 1'],
  ['functions/src/index.ts', 'assertBasicSmeInventoryCapacity'],
  ['functions/src/index.ts', 'assertBasicSmeCustomerCapacity'],
  ['functions/src/index.ts', 'assertBasicSmeSellerCapacity'],
  ['functions/src/index.ts', 'assertBasicSmeAdditionalMemberCapacity'],
  ['src/repositories/spaceRepository.ts', 'createSpaceWithEntitlement'],
  ['firestore.rules', 'Created by entitlement-enforced Cloud Functions'],
];

let failures = 0;

for (const [path, marker] of checks) {
  const ok =
    fs.existsSync(path)
    && fs.readFileSync(path, 'utf8').includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${path}: ${marker}`,
  );

  if (!ok) {
    failures += 1;
  }
}

const functions =
  fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const usages = [
  'if (!productId) {\n    await assertBasicSmeInventoryCapacity',
  'if (!customerId) {\n    await assertBasicSmeCustomerCapacity',
  'if (!sellerId) {\n    await assertBasicSmeSellerCapacity',
  'if (!listingId) {\n    await assertBasicSmeInventoryCapacity',
  'await assertBasicSmeAdditionalMemberCapacity',
];

for (const marker of usages) {
  const ok = functions.includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} entitlement usage`,
  );

  if (!ok) {
    failures += 1;
  }
}

if (failures > 0) {
  console.error(
    `Slice 3 verifier failed: ${failures}`,
  );

  process.exit(1);
}

console.log(
  'Slice 3 entitlement verifier: PASS',
);
