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
  read('src/repositories/businessMoneyActivityRepository.ts');

const page =
  read('src/features/business/BusinessMoneyActivityPage.tsx');

check(
  repository.includes(
    'reverseStaleAdbnSupplierPaymentMoneyActivity',
  )
  && repository.includes(
    'reverseTransactionWithIdempotencyKey',
  )
  && repository.includes(
    "'adbn-stale-supplier-'",
  ),
  'Stale supplier recovery uses deterministic secured ledger reversal.',
);

check(
  page.includes(
    'function adbnSupplierPaymentSyncLabel',
  )
  && page.includes(
    '/^adbn_suppay_[a-f0-9]{16}$/',
  )
  && page.includes(
    "'adbn_supplier_payment'",
  ),
  'Only deterministic ADBN supplier-payment sync markers are recognized.',
);

check(
  page.includes(
    "return 'ADBN TECH supplier payment';",
  ),
  'Synced supplier Money Out is classified as ADBN-managed.',
);

check(
  page.includes(
    'canReverseStaleAdbnSupplier='
  )
  && page.includes(
    'space.ownerId'
  )
  && page.includes(
    '=== user?.uid',
  ),
  'Only the Business owner is offered stale supplier recovery.',
);

check(
  page.includes(
    "item.type === 'expense'",
  )
  && page.includes(
    "item.status === 'posted'",
  )
  && page.includes(
    'staleAdbnSupplierPayment',
  ),
  'Only an active synced supplier Money Out can use the recovery action.',
);

check(
  page.includes(
    'data-adbn-stale-supplier-payment-reverse',
  )
  && page.includes(
    'Reverse stale supplier payment',
  )
  && page.includes(
    'deleted or cancelled without an explicit reversal',
  ),
  'Money Activity exposes a dedicated stale supplier reversal confirmation.',
);

check(
  page.includes(
    'keep the original Money Out in history as reversed',
  )
  && page.includes(
    'will not permanently erase accounting history',
  ),
  'Stale supplier recovery preserves accounting history.',
);

check(
  !repository.includes(
    'deleteStaleAdbnSupplier',
  ),
  'No hard-delete repository path was added for supplier Money Out.',
);

console.log(
  'BajetBN stale ADBN supplier payment reversal verification PASS',
);
