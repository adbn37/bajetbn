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

check(
  sync.includes('autoReconcileChangedAdbnTechExpenses')
  && sync.includes('findPostedAdbnExpenseTransaction')
  && sync.includes('adbnExpenseTransactionMatches'),
  'Automatic reconciliation only targets already-synced active expense Money Out records.',
);

check(
  sync.includes('if (!currentTransaction) {')
  && sync.includes('continue;'),
  'Missing or deleted source expenses are ignored by automatic reconciliation.',
);

check(
  sync.includes('reconcileAdbnTechExpenseToBajetBn')
  && sync.includes('reconciled += 1')
  && sync.includes('transactions?: FinancialTransaction[];'),
  'Changed synced expenses reuse the audited reverse-old plus corrected-post flow.',
);

check(
  sync.includes('!mappedAccountId')
  && sync.includes('!expense.bankAccountId')
  && sync.includes('blocked += 1'),
  'Unmapped or invalid changed expenses are blocked instead of guessed.',
);

check(
  workspace.includes('autoReconcileChangedAdbnTechExpenses')
  && workspace.includes('syncSummary.transactions')
  && workspace.includes('reconciliationSummary.transactions'),
  'Automatic edit reconciliation runs after the new-expense auto-sync pass.',
);

check(
  workspace.includes('auto-reconciled.')
  && workspace.includes('reconciliationSummary.reconciled'),
  'Expenses workspace reports automatic reconciliation results.',
);

check(
  workspace.includes(
    'Already-synced expenses are automatically reconciled if their ADBN source values change.',
  )
  && workspace.includes(
    'Deleted or missing source expenses are never reversed automatically.',
  ),
  'The UI clearly separates edit reconciliation from manual stale deletion recovery.',
);

check(
  workspace.includes('Reconcile change'),
  'Manual Reconcile change remains available when automatic reconciliation is off or blocked.',
);

console.log(
  'BajetBN ADBN TECH expense automatic reconciliation verification PASS',
);
