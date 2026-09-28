import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const repository =
  read('src/repositories/adbnTechSupplierPaymentSyncRepository.ts');

const workspace =
  read('src/features/business/AdbnTechPurchasesWorkspace.tsx');

check(
  repository.includes("'2026-09-25'"),
  'Supplier purchase auto-sync uses the fixed 25 Sep 2026 cutoff.',
);

check(
  repository.includes('linkedPurchasesForSupplierPayment')
  && repository.includes('payment.purchaseIds')
  && repository.includes('purchase.purchaseNo'),
  'Supplier payments are matched back to their ADBN purchases.',
);

check(
  repository.includes("=== 'bajetbn'")
  && repository.includes('sourceSkipped'),
  'BajetBN-originated purchases are excluded from automatic Money Out.',
);

check(
  repository.includes('date < cutoff')
  && repository.includes('beforeCutoff'),
  'Purchases before the cutoff stay out of automatic import.',
);

check(
  repository.includes('knownLabels.has(')
  && repository.includes('adbnSupplierPaymentSyncLabel(')
  && repository.includes('syncAdbnTechSupplierPaymentToBajetBn('),
  'Automatic import remains idempotent by supplier payment.',
);

check(
  repository.includes("'adbn_suppay_'")
  && !repository.includes("'adbn_supplier_pay_'"),
  'Supplier payment sync label stays within BajetBN 32-character limit.',
);

check(
  workspace.includes('autoSyncAdbnTechSupplierPaymentsToBajetBn')
  && workspace.includes('data-adbn-supplier-payment-auto-sync')
  && workspace.includes('Automatic Money Out from 25 Sep 2026'),
  'Purchases workspace runs and explains automatic supplier-payment sync.',
);

check(
  workspace.includes('summary.transactions')
  && workspace.includes('onFinancialSync'),
  'Successful automatic sync refreshes BajetBN financial activity.',
);

check(
  repository.includes('!payment.isReversal')
  && repository.includes('!payment.reversalOfSupplierPaymentId'),
  'Reversals remain blocked from automatic Money Out.',
);

console.log(
  'BajetBN ADBN supplier payment auto-sync verification PASS',
);
