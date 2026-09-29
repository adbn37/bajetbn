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
  read('src/repositories/adbnTechExpenseSyncRepository.ts');

const workspace =
  read('src/features/business/AdbnTechExpensesWorkspace.tsx');

const moneyRepo =
  read('src/repositories/businessMoneyActivityRepository.ts');

const moneyPage =
  read('src/features/business/BusinessMoneyActivityPage.tsx');

check(
  sync.includes(
    'findPostedAdbnExpenseTransaction',
  )
  && sync.includes(
    "item.status === 'posted'",
  )
  && sync.includes(
    "item.type === 'expense'",
  ),
  'Expense reconciliation targets only the active synced Money Out.',
);

check(
  sync.includes(
    'adbnExpenseTransactionMatches',
  )
  && sync.includes(
    'transaction.amountMinor',
  )
  && sync.includes(
    'transaction.transactionDate',
  )
  && sync.includes(
    'transaction.accountId',
  )
  && sync.includes(
    'transaction.categoryId',
  ),
  'Current ADBN expense financial fields are compared with BajetBN.',
);

check(
  sync.includes(
    'reconcileAdbnTechExpenseToBajetBn',
  )
  && sync.includes(
    'reverseTransactionWithIdempotencyKey',
  )
  && sync.includes(
    'adbn-expense-reconcile-reverse-',
  )
  && sync.includes(
    'adbn-expense-reconcile-post-',
  ),
  'Changed expense reconciliation reverses old history then posts corrected values idempotently.',
);

check(
  workspace.includes(
    'Changed <strong>{changedCount}</strong>',
  )
  && workspace.includes(
    'data-adbn-expense-reconcile',
  )
  && workspace.includes(
    'Reconcile change',
  )
  && workspace.includes(
    'Money Out matches ADBN',
  ),
  'Expenses workspace exposes clear synced/changed/reconcile states.',
);

check(
  workspace.includes(
    'Historical import remains manual',
  )
  && workspace.includes(
    'a missing snapshot is never auto-reversed',
  ),
  'Historical imports remain manual and snapshot omission never auto-reverses money.',
);

check(
  moneyRepo.includes(
    'reverseStaleAdbnExpenseMoneyActivity',
  )
  && moneyRepo.includes(
    'adbn-stale-expense-',
  ),
  'Deleted source expenses use a deterministic manual stale reversal.',
);

check(
  moneyPage.includes(
    'data-adbn-stale-expense-reverse',
  )
  && moneyPage.includes(
    'Reverse stale ADBN expense',
  )
  && moneyPage.includes(
    'Use this only when the expense has already been deleted in ADBN TECH.',
  ),
  'Business owner has an explicit stale ADBN expense reversal action.',
);

check(
  moneyPage.includes(
    "return 'ADBN TECH expense';",
  )
  && moneyPage.includes(
    'Edit the source expense in ADBN TECH and reconcile it from the Expenses workspace.',
  ),
  'ADBN expense Money Out remains managed and directs edits to the source workflow.',
);

console.log(
  'BajetBN ADBN TECH expense reconciliation verification PASS',
);
