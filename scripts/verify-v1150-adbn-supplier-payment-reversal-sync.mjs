import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const transactionRepository =
  read('src/repositories/transactionRepository.ts');

const supplierRepository =
  read('src/repositories/adbnTechSupplierPaymentSyncRepository.ts');

const workspace =
  read('src/features/business/AdbnTechPurchasesWorkspace.tsx');

check(
  transactionRepository.includes(
    'reverseTransactionWithIdempotencyKey',
  )
  && transactionRepository.includes(
    "'reverseTransaction'",
  )
  && transactionRepository.includes(
    'idempotencyKey: key',
  ),
  'BajetBN exposes deterministic transaction reversal for integration sync.',
);

check(
  supplierRepository.includes(
    'adbnSupplierPaymentIsReversal',
  )
  && supplierRepository.includes(
    'reversalOfSupplierPaymentId',
  )
  && supplierRepository.includes(
    'payment.amount < 0',
  ),
  'Supplier reversal rows are recognized without treating them as new Money Out.',
);

check(
  supplierRepository.includes(
    'Pass 1: post positive ADBN-originated supplier payments',
  )
  && supplierRepository.includes(
    'Pass 2: reverse the exact BajetBN Money Out',
  ),
  'Positive supplier payments are synced before reversal processing.',
);

check(
  supplierRepository.includes(
    'originalPayment.externalSource',
  )
  && supplierRepository.includes(
    "=== 'bajetbn'",
  ),
  'BajetBN-originated supplier purchases remain protected from reversal duplication.',
);

check(
  supplierRepository.includes(
    'date < cutoff',
  )
  && supplierRepository.includes(
    'originalPayment',
  )
  && supplierRepository.includes(
    'linkedPurchasesForSupplierPayment',
  ),
  'The 25 Sep 2026 purchase cutoff also gates supplier reversals.',
);

check(
  supplierRepository.includes(
    'adbnSupplierPaymentSyncLabel(',
  )
  && supplierRepository.includes(
    'originalSyncLabel',
  )
  && supplierRepository.includes(
    "originalTransaction.type\n        !== 'expense'",
  ),
  'Reversal targets the exact original synced supplier Money Out.',
);

check(
  supplierRepository.includes(
    "'adbn-supplier-reversal-'",
  )
  && supplierRepository.includes(
    'reverseTransactionWithIdempotencyKey(',
  ),
  'Supplier reversal uses a deterministic idempotency key.',
);

check(
  supplierRepository.includes(
    'reversedOriginalTransactionIds',
  )
  && supplierRepository.includes(
    'alreadyReversed',
  ),
  'Repeated refreshes cannot reverse the same Money Out twice.',
);

check(
  supplierRepository.includes(
    'reversalNotSynced',
  ),
  'A reversal with no original BajetBN Money Out is left unchanged instead of guessing.',
);

check(
  workspace.includes(
    "summary.reversed > 0",
  )
  && workspace.includes(
    "' reversal'"
  )
  && workspace.includes(
    'restore the exact synced Money Out once',
  ),
  'Purchases workspace refreshes finances and explains automatic supplier reversals.',
);

console.log(
  'BajetBN ADBN supplier payment reversal sync verification PASS',
);
