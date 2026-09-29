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

const integration = read('src/repositories/adbnTechIntegrationRepository.ts');
const sync = read('src/repositories/adbnTechExpenseSyncRepository.ts');
const workspace = read('src/features/business/AdbnTechExpensesWorkspace.tsx');
const home = read('src/features/business/BusinessHomePage.tsx');
const money = read('src/features/business/BusinessMoneyActivityPage.tsx');

check(
  integration.includes('export interface AdbnTechExpenseMirror')
  && integration.includes('export interface AdbnTechExpensesReadOnlySnapshot')
  && integration.includes('loadAdbnTechExpensesReadOnly')
  && integration.includes("collection(\n        db,\n        'expenses',"),
  'ADBN expenses have a dedicated read-only mirror.',
);

check(
  !workspace.includes("collection(db, 'expenses')")
  && !workspace.includes('updateDoc(')
  && !workspace.includes('deleteDoc('),
  'BajetBN does not write ADBN expense records.',
);

check(
  sync.includes('adbnExpenseSyncLabel')
  && sync.includes("'adbn_exp_'")
  && sync.includes("'adbn_expense'")
  && sync.includes('postTransactionWithIdempotencyKey'),
  'Expense Money Out uses deterministic idempotent sync markers.',
);

check(
  sync.includes("type: 'expense'")
  && sync.includes('mappedAccountId')
  && sync.includes('expense.bankAccountId')
  && sync.includes('paymentMethodFromAdbn'),
  'Expense sync posts Money Out to the mapped BajetBN Business account.',
);

check(
  workspace.includes('Manual Money Out sync')
  && workspace.includes('Sync to BajetBN')
  && workspace.includes('Set account mapping in Payments')
  && workspace.includes('Expense edits and deletions remain controlled in ADBN TECH'),
  'First expense slice stays manual and clearly explains its reconciliation boundary.',
);

check(
  workspace.includes('syncedLabels')
  && workspace.includes('adbnExpenseSyncLabel(')
  && workspace.includes('Synced Money Out'),
  'Expenses workspace detects already-synced Money Out records.',
);

check(
  home.includes("| 'adbn_expenses'")
  && home.includes("setWorkspaceView('adbn_expenses')")
  && home.includes('<AdbnTechExpensesWorkspace')
  && home.includes('>\n              Expenses\n            </button>'),
  'Expenses is a normal top-level ADBN Business workspace.',
);

check(
  money.includes('function adbnExpenseSyncLabel(')
  && money.includes('/^adbn_exp_[a-f0-9]{16}$/')
  && money.includes("return 'ADBN TECH expense';"),
  'Synced ADBN expense Money Out is protected as managed activity.',
);

check(
  sync.includes("'expense-utilities'")
  && sync.includes("'expense-wages'")
  && sync.includes("'expense-rent'")
  && sync.includes("'expense-supplies'")
  && sync.includes("'expense-other'"),
  'Common ADBN expense categories map to BajetBN business expense categories.',
);

console.log('BajetBN ADBN TECH expense manual Money Out sync verification PASS');
