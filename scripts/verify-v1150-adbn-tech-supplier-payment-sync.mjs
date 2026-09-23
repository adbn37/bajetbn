import fs from 'node:fs';

function fail(message) {
  console.error('VERIFY FAIL:', message);
  process.exit(1);
}

function read(path) {
  if (!fs.existsSync(path)) {
    fail(path + ' is missing.');
  }
  return fs.readFileSync(path, 'utf8');
}

function must(content, marker, label) {
  if (!content.includes(marker)) {
    fail(label + ' missing marker: ' + marker);
  }
}

const integration =
  read('src/repositories/adbnTechIntegrationRepository.ts');

for (const marker of [
  'AdbnTechSupplierPaymentMirror',
  'supplierPayments: AdbnTechSupplierPaymentMirror[]',
  "'supplierPayments'",
  'reversalOfSupplierPaymentId',
  'bankAccountId',
  'paymentMethod',
]) {
  must(
    integration,
    marker,
    'ADBN supplier payment mirror',
  );
}

const sync =
  read('src/repositories/adbnTechSupplierPaymentSyncRepository.ts');

for (const marker of [
  'adbnSupplierPaymentCanPost',
  'adbnSupplierPaymentSyncLabel',
  'syncAdbnTechSupplierPaymentToBajetBn',
  "type: 'expense'",
  "categoryId:",
  "'expense-supplier'",
  "'adbn_supplier_payment'",
  'postTransactionWithIdempotencyKey',
  '!payment.isReversal',
  '!payment.reversalOfSupplierPaymentId',
]) {
  must(
    sync,
    marker,
    'ADBN supplier payment Money Out sync',
  );
}

const workspace =
  read('src/features/business/AdbnTechPurchasesWorkspace.tsx');

for (const marker of [
  "type PurchaseView",
  "'supplier_payments'",
  'Supplier Payments',
  'data-adbn-tech-supplier-payment-sync',
  'syncAdbnTechSupplierPaymentToBajetBn',
  'Set account mapping in Payments',
  'Money Out',
  'Reversal stays manual',
]) {
  must(
    workspace,
    marker,
    'Purchases supplier payment UI',
  );
}

for (const forbidden of [
  'addDoc(',
  'updateDoc(',
  'deleteDoc(',
  'setDoc(',
  'runTransaction(',
]) {
  if (
    workspace.includes(forbidden)
    || sync.includes(
      "collection(db, 'supplierPayments')",
    )
  ) {
    fail(
      '24E.1 must not write ADBN TECH supplier payment records.',
    );
  }
}

const home =
  read('src/features/business/BusinessHomePage.tsx');

must(
  home,
  '<AdbnTechPurchasesWorkspace',
  'Business Home purchases render',
);

must(
  home,
  'onFinancialSync={',
  'Business Home financial refresh hook',
);

const categories =
  read('src/features/categories/defaultCategories.ts');

must(
  categories,
  "id: 'expense-supplier'",
  'Supplier purchase expense category',
);

const pkg =
  read('package.json');

must(
  pkg,
  'verify-v1150-adbn-tech-supplier-payment-sync.mjs',
  'structural verifier chain',
);

console.log(
  'ADBN TECH supplier payment Money Out sync verification PASS',
);
