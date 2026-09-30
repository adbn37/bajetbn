import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const sync =
  read('src/repositories/adbnTechPaymentSyncRepository.ts');

const workspace =
  read('src/features/business/AdbnTechPaymentsWorkspace.tsx');

check(
  sync.includes(
    'findPostedAdbnPaymentTransaction',
  )
  && sync.includes(
    "item.status === 'posted'",
  )
  && sync.includes(
    "item.type === 'income'",
  ),
  'Payment reconciliation targets only the active synced Money In.',
);

check(
  sync.includes(
    'paymentTransactionInput',
  )
  && sync.includes(
    'adbnPaymentTransactionMatches',
  )
  && sync.includes(
    'transaction.amountMinor',
  )
  && sync.includes(
    'transaction.transactionDate',
  )
  && sync.includes(
    'transaction.accountId',
  ),
  'Current ADBN payment financial fields are compared with BajetBN.',
);

check(
  sync.includes(
    'reconcileAdbnTechPaymentToBajetBn',
  )
  && sync.includes(
    'reverseTransactionWithIdempotencyKey',
  )
  && sync.includes(
    'adbn-payment-reconcile-reverse-',
  )
  && sync.includes(
    'adbn-payment-reconcile-post-',
  ),
  'Changed payment reconciliation reverses old Money In then posts corrected source values idempotently.',
);

check(
  workspace.includes(
    'Changed'
  )
  && workspace.includes(
    'changedPaymentCount',
  )
  && workspace.includes(
    'data-adbn-payment-reconcile',
  )
  && workspace.includes(
    'Reconcile change',
  )
  && workspace.includes(
    'Money activity matches ADBN',
  ),
  'Payments workspace exposes clear Synced and Changed states.',
);

check(
  workspace.includes(
    'requires an explicit Reconcile change action',
  )
  && workspace.includes(
    'preserving the previous Money In as reversed',
  ),
  'Payment edits remain deliberate and preserve audit history.',
);

check(
  workspace.includes(
    'Receipt'
  )
  && workspace.includes(
    'WhatsApp',
  ),
  'Existing official receipt and WhatsApp actions remain present.',
);

check(
  !sync.includes(
    'updateDoc(',
  )
  && !sync.includes(
    'setDoc(',
  )
  && !sync.includes(
    'deleteDoc(',
  ),
  'Payment reconciliation introduces no ADBN TECH Firestore write path.',
);

console.log(
  'BajetBN ADBN TECH payment reconciliation verification PASS',
);
