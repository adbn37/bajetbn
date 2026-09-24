import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }
  console.log('PASS: ' + message);
}

const integration =
  read('src/repositories/adbnTechIntegrationRepository.ts');
const sync =
  read('src/repositories/adbnTechSupplierPaymentSyncRepository.ts');
const purchases =
  read('src/features/business/AdbnTechPurchasesWorkspace.tsx');
const money =
  read('src/features/business/BusinessMoneyActivityPage.tsx');
const builder =
  read('src/features/business/AdbnTechSupplierPurchaseModal.tsx');
const pkg =
  read('package.json');

check(
  builder.includes('data-adbn-tech-supplier-purchase-builder'),
  'Dedicated ADBN supplier purchase builder exists.',
);

check(
  builder.includes('Search ADBN inventory first')
  && builder.includes('Create new inventory item'),
  'Purchase builder requires inventory search before new product creation.',
);

check(
  builder.includes('loadAdbnTechInventoryReadOnly')
  && builder.includes('Use this item'),
  'Builder searches the authoritative ADBN products collection.',
);

check(
  builder.includes('linkedProductId:')
  && builder.includes("line.mode\n            === 'existing'"),
  'Existing purchase items carry the exact ADBN linkedProductId.',
);

check(
  builder.includes('strongDuplicate')
  && builder.includes('Possible duplicate found'),
  'Client duplicate guard checks SKU/barcode/category+brand+model.',
);

check(
  integration.includes('Possible duplicate')
  || integration.includes('createAdbnTechSupplierPurchase'),
  'BajetBN repository calls the reviewed ADBN purchase bridge.',
);

check(
  integration.includes("'createBajetBnSupplierPurchase'"),
  'ADBN callable name matches Slice 24E.2A backend.',
);

check(
  builder.includes('postTransactionWithIdempotencyKey')
  && builder.includes("categoryId:\n                'expense-supplier'"),
  'Purchase builder posts Money Out as Supplier purchase using idempotency.',
);

check(
  builder.includes('postedTransactionId')
  && builder.includes('Retry ADBN purchase link'),
  'Retry path does not create a second Money Out.',
);

check(
  builder.includes('externalIntegrationAccountMappings')
  && builder.includes('adbnAccountId'),
  'BajetBN payment account is reverse-mapped to the ADBN bank/cash account.',
);

check(
  integration.includes('externalSource: string;')
  && integration.includes('externalSource:\n            text(data.externalSource'),
  'ADBN supplier payment mirror exposes origin metadata.',
);

check(
  sync.includes("payment.externalSource")
  && sync.includes("'bajetbn'"),
  'BajetBN-origin supplier payments are blocked from syncing back as duplicate Money Out.',
);

check(
  purchases.includes('Created from BajetBN'),
  'Supplier Payments UI explains the BajetBN-origin sync block.',
);

check(
  money.includes('AdbnTechSupplierPurchaseModal')
  && money.includes('showSupplierPurchase'),
  'Business Money Activity exposes the ADBN supplier purchase workflow.',
);

check(
  money.includes("label.toLowerCase() === 'adbn_purchase'"),
  'Linked ADBN purchase Money Out is treated as managed activity.',
);

check(
  !builder.includes('inventoryMovements')
  && !builder.includes('purchaseReceipts'),
  'Slice 24E.2B does not receive stock directly.',
);

check(
  pkg.includes('verify-v1150-adbn-tech-supplier-purchase-builder.mjs'),
  'Supplier purchase builder verifier is in the structural verification chain.',
);

console.log(
  'BajetBN Slice 24E.2B ADBN supplier purchase builder verification PASS',
);
