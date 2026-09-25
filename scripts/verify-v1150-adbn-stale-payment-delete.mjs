import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }
  console.log('PASS: ' + message);
}

const functions =
  read('functions/src/index.ts');
const repository =
  read('src/repositories/businessMoneyActivityRepository.ts');
const page =
  read('src/features/business/BusinessMoneyActivityPage.tsx');

const start =
  functions.indexOf(
    'export const deleteStaleAdbnPaymentMoneyActivity',
  );
const end =
  functions.indexOf(
    'export const reverseTransaction',
    start,
  );
const block =
  start >= 0 && end > start
    ? functions.slice(start, end)
    : '';

check(
  block.includes(
    "Only an ADBN TECH payment sync can use this manual delete.",
  )
  && functions.includes(
    "/^adbn_pay_[a-f0-9]{16}$/",
  )
  && functions.includes(
    "'adbn_tech'",
  ),
  'Manual delete is restricted to deterministic ADBN payment-sync markers.',
);

check(
  block.includes(
    "original.type !== 'income'",
  )
  && block.includes(
    "original.status !== 'posted'",
  ),
  'Only active ADBN Money In rows are eligible.',
);

check(
  block.includes('externalIntegrationProvider')
  && block.includes("'adbn_tech'")
  && block.includes('.ownerId'),
  'Backend requires the connected ADBN Business Space owner.',
);

check(
  block.includes('-accountEffect(')
  && block.includes('updateAccountBalance('),
  'Removing the stale row removes its Business Account financial effect.',
);

check(
  block.includes('transaction.delete(\n          ledgerRef')
  && block.includes('transaction.delete(\n          originalRef'),
  'Original ledger entry and transaction are deleted.',
);

check(
  block.includes("'adbn-payment-'")
  && block.includes('originalSyncCommandRef')
  && block.includes('transaction.delete(\n          originalSyncCommandRef'),
  'Original deterministic ADBN sync command is cleared.',
);

check(
  block.includes("'adbnStalePaymentDeletions'")
  && block.includes('deletedBy')
  && block.includes('deletedAt'),
  'Removal leaves an audit tombstone.',
);

check(
  block.includes("'transactionAttachments'")
  && block.includes('Remove the attached receipt or document'),
  'Attachments block permanent deletion until explicitly removed.',
);

check(
  repository.includes(
    "'deleteStaleAdbnPaymentMoneyActivity'",
  ),
  'Business Money repository exposes the secured callable.',
);

check(
  page.includes(
    'data-adbn-stale-payment-delete',
  )
  && page.includes(
    'Remove stale ADBN record',
  )
  && page.includes(
    'If the payment still exists in ADBN TECH, auto-sync may create it again.',
  ),
  'Business Money Details exposes the manual stale-delete action with warning.',
);

check(
  page.includes('space.ownerId')
  && page.includes('=== user?.uid')
  && page.includes('canDeleteStaleAdbn'),
  'Only the Business owner is offered the stale-delete action.',
);

check(
  page.includes(
    "return 'ADBN TECH payment';",
  ),
  'ADBN payment rows are treated as managed records.',
);

console.log(
  'BajetBN stale ADBN payment manual-delete hotfix verification PASS',
);
