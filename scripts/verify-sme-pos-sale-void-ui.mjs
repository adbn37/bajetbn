import fs from 'node:fs';

const standard =
  fs.readFileSync(
    'src/features/sme-pos/StandardPosWorkspace.tsx',
    'utf8',
  );

const marketplace =
  fs.readFileSync(
    'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
    'utf8',
  );

const checks = [
  [standard, 'voidSmePosSale,', 'standard void import'],
  [standard, 'const canVoidSales = role === \'owner\';', 'standard owner-only UI'],
  [standard, 'async function submitVoidSale', 'standard void submit'],
  [standard, 'Void sale and reverse', 'standard confirmation'],
  [standard, 'receipt.status === \'voided\'', 'standard void receipt state'],
  [standard, 'receipt.voidReason', 'standard void reason'],
  [standard, '![' + "'refunded', 'voided'" + '].includes(receipt.status)', 'standard return block'],

  [marketplace, 'voidSmePosSale,', 'marketplace void import'],
  [marketplace, 'const canVoidSales = role === \'owner\';', 'marketplace owner-only UI'],
  [marketplace, 'async function submitVoidSale', 'marketplace void submit'],
  [marketplace, 'Void sale and reverse', 'marketplace confirmation'],
  [marketplace, 'receipt.status === \'voided\'', 'marketplace void receipt state'],
  [marketplace, 'receipt.voidReason', 'marketplace void reason'],
  [marketplace, 'Void adjustment', 'marketplace seller-ledger label'],
  [marketplace, "sale.status !== 'voided'", 'marketplace return scanner filter'],
];

let failures = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!ok) failures += 1;
}

if (
  standard.includes(
    "const canVoidSales = role === 'owner' || role === 'manager'",
  )
  || marketplace.includes(
    "const canVoidSales = role === 'owner' || role === 'manager'",
  )
) {
  console.error('FAIL Void Sale UI must remain owner-only.');
  failures += 1;
}

if (failures > 0) {
  console.error(
    `Slice 4B verifier failed: ${failures}`,
  );

  process.exit(1);
}

console.log(
  'Slice 4B owner Void Sale UI verifier: PASS',
);
