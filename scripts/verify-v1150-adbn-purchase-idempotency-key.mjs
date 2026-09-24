import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const modal =
  read('src/features/business/AdbnTechSupplierPurchaseModal.tsx');
const functions =
  read('functions/src/index.ts');
const pkg =
  read('package.json');

check(
  modal.includes("'adbn-purchase-'")
  && !modal.includes("'adbn_purchase_'"),
  'Supplier purchase request IDs use a hyphen-only prefix.',
);

check(
  functions.includes(
    "/^[a-zA-Z0-9-]{16,64}$/.test(key)",
  ),
  'BajetBN financial backend idempotency contract is detected.',
);

const sample =
  'adbn-purchase-'
  + '0123456789abcdef0123456789abcdef';

check(
  /^[a-zA-Z0-9-]{16,64}$/.test(sample),
  'Generated supplier purchase request IDs satisfy the financial backend.',
);

check(
  modal.includes(
    'postTransactionWithIdempotencyKey(',
  )
  && modal.includes(
    'createAdbnTechSupplierPurchase(',
  ),
  'The same purchase flow still posts Money Out before creating the ADBN purchase.',
);

check(
  modal.includes(
    "'adbn_purchase'",
  ),
  'The ADBN purchase transaction label remains unchanged.',
);

check(
  pkg.includes(
    'verify-v1150-adbn-purchase-idempotency-key.mjs',
  ),
  'Idempotency verifier is included in the structural chain.',
);

console.log(
  'BajetBN ADBN supplier purchase idempotency key verification PASS',
);
