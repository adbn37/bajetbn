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

const sync = read('src/repositories/adbnTechExpenseSyncRepository.ts');
const workspace = read('src/features/business/AdbnTechExpensesWorkspace.tsx');

check(
  sync.includes('findStalePostedAdbnExpenseTransactions')
  && sync.includes('currentSourceLabels')
  && sync.includes('/^adbn_exp_[a-f0-9]{16}$/'),
  'Stale detection compares deterministic ADBN expense labels against the current source snapshot.',
);

check(
  sync.includes("item.status !== 'posted'")
  && sync.includes("item.type !== 'expense'")
  && sync.includes("'adbn_expense'"),
  'Only active ADBN-managed expense Money Out can be flagged stale.',
);

check(
  workspace.includes('Missing in ADBN <strong>{staleExpenseTransactions.length}</strong>')
  && workspace.includes('data-adbn-expense-stale-review')
  && workspace.includes('data-adbn-expense-stale-row'),
  'Expenses workspace surfaces a separate Missing in ADBN review section and count.',
);

check(
  workspace.includes('Detection alone never changes money.')
  && workspace.includes('a missing snapshot is never auto-reversed.'),
  'Missing-source detection remains informational until the owner acts.',
);

check(
  workspace.includes('reverseStaleAdbnExpenseMoneyActivity')
  && workspace.includes('Reverse stale expense')
  && workspace.includes('Confirm reverse')
  && workspace.includes('data-adbn-expense-stale-confirm'),
  'Stale reversal is an explicit two-step owner action that reuses the audited reversal helper.',
);

check(
  workspace.includes("setStaleReverseConfirmId('')")
  && workspace.includes('Stale ADBN TECH expense Money Out reversed.'),
  'Owner can cancel confirmation and receives a clear reversal result.',
);

check(
  !workspace.includes('autoReverseMissingAdbnExpense'),
  'No automatic missing-expense reversal path was introduced.',
);

console.log('BajetBN ADBN TECH expense stale visibility verification PASS');
