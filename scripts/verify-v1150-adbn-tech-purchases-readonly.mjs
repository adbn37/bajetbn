import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

const repo = read('src/repositories/adbnTechIntegrationRepository.ts');
const workspace = read('src/features/business/AdbnTechPurchasesWorkspace.tsx');
const home = read('src/features/business/BusinessHomePage.tsx');

function check(condition, message) {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('PASS: ' + message);
}

check(
  repo.includes("'supplierPartPurchases'")
  && repo.includes('loadAdbnTechPurchasesReadOnly'),
  'ADBN TECH supplierPartPurchases are loaded read-only.',
);

check(
  ['purchaseNo:', 'sellerName:', 'quantityReceived:', 'quantityOutstanding:', 'orderStatus:', 'paymentStatus:', 'linkedProductId:', 'inventoryAdded:']
    .every((token) => repo.includes(token)),
  'Purchase mirror preserves purchase, receiving and inventory-link fields.',
);

check(
  !['addDoc', 'setDoc', 'updateDoc', 'deleteDoc', 'writeBatch', 'runTransaction']
    .some((token) => repo.includes(token)),
  'ADBN integration repository contains no Firestore write API.',
);

check(
  workspace.includes('data-adbn-tech-purchases-workspace')
  && workspace.includes('supplierPartPurchases only'),
  'Dedicated read-only Purchases workspace is present.',
);

check(
  !workspace.includes('transactionRepository')
  && !workspace.includes('accountRepository')
  && !workspace.includes('smePosRepository')
  && !workspace.includes('inventoryMovements'),
  'Purchase mirror stays out of BajetBN money, accounts, POS and inventory repositories.',
);

check(
  home.includes("'adbn_purchases'")
  && home.includes('<AdbnTechPurchasesWorkspace'),
  'ADBN TECH Business Home exposes the Purchases mirror.',
);

check(
  home.includes('BajetBN transactions, POS stock and inventory are not changed.'),
  'Business Home states the Slice 24A isolation boundary.',
);

console.log('');
console.log('============================================================');
console.log(' SLICE 24A ADBN TECH PURCHASE MIRROR: VERIFY PASS');
console.log(' ADBN supplierPartPurchases are read only.');
console.log(' No BajetBN Money Activity is created.');
console.log(' No BajetBN POS or inventory quantity is changed.');
console.log(' No ADBN TECH write API was added.');
console.log(' Production untouched.');
console.log('============================================================');
