import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const fn =
  read('functions/src/index.ts');

const models =
  read('src/types/models.ts');

const repo =
  read('src/repositories/smePosRepository.ts');

const checks = [
  [fn, 'export const voidSmePosSale', 'void callable'],
  [fn, "requireSmePosActor(spaceId, uid, ['owner'])", 'owner-only enforcement'],
  [fn, "kind: 'void_adjustment'", 'seller void ledger'],
  [fn, "status: 'voided'", 'sale void status'],
  [fn, 'voidedBy: uid', 'void actor'],
  [fn, 'voidReason: reason', 'void reason'],
  [fn, 'marketplace_pos_sale_void', 'marketplace payment reversal'],
  [fn, 'sme_pos_sale_void', 'standard payment reversal'],
  [fn, 'posVoid: true', 'financial reversal linkage'],
  [fn, 'quantityOnHand:', 'stock reversal'],
  [fn, 'totalSpentMinor:', 'customer totals reversal'],
  [fn, 'sellerAdjustments.forEach', 'seller totals reversal'],
  [fn, 'saleVoidedAt: now', 'reservation audit'],
  [models, "'void_adjustment'", 'seller ledger type'],
  [models, "'voided'", 'sale status type'],
  [models, 'voidedAt?: Timestamp | null;', 'sale audit fields'],
  [repo, 'export async function voidSmePosSale', 'repository callable'],
];

let failures = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!ok) failures += 1;
}

if (failures > 0) {
  console.error(
    `Slice 4A verifier failed: ${failures}`,
  );

  process.exit(1);
}

console.log(
  'Slice 4A POS void backend verifier: PASS',
);
