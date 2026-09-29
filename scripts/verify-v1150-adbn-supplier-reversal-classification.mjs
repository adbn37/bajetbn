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
  repository.includes(
    'manualReversals: number;'
  )
  && repository.includes(
    'manualReversalDetails: string[];'
  ),
  'Auto-sync summary separates manual legacy reversals from blocked payments.',
);

check(
  repository.includes(
    'const recordManualReversal ='
  )
  && repository.includes(
    'manualReversals += 1'
  ),
  'Untargeted reversals have their own classification path.',
);

check(
  repository.includes(
    'if (!originalPaymentId)'
  )
  && repository.includes(
    'recordManualReversal('
  )
  && !repository.includes(
    "'reversal has no original supplier payment ID'"
  ),
  'A reversal without an explicit original payment ID is not counted as blocked.',
);

check(
  repository.includes(
    "'original supplier payment is not available in the ADBN snapshot'"
  )
  && repository.includes(
    'recordBlocked('
  ),
  'A claimed original payment that cannot be resolved remains genuinely blocked.',
);

check(
  workspace.includes(
    'summary.manualReversals'
  )
  && workspace.includes(
    "' manual/unlinked reversal'"
  )
  && workspace.includes(
    'summary.manualReversalDetails'
  ),
  'Purchases workspace reports manual reversals separately.',
);

check(
  workspace.includes(
    "'Manual / unlinked reversal'"
  )
  && workspace.includes(
    "'Linked reversal'"
  ),
  'Supplier payment rows distinguish untargeted and linked reversals.',
);

check(
  repository.includes(
    "ADBN_SUPPLIER_PURCHASE_AUTO_SYNC_CUTOFF =\n  '2026-09-25';"
  ),
  '25 Sep 2026 purchase cutoff remains unchanged.',
);

check(
  repository.includes(
    'reverseTransactionWithIdempotencyKey'
  ),
  'Existing explicit linked reversal automation remains intact.',
);

console.log(
  'BajetBN ADBN supplier reversal classification verification PASS',
);
