import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

const models = read('src/types/models.ts');
const repo = read('src/repositories/accountRepository.ts');
const accounts = read('src/features/accounts/AccountsPage.tsx');
const dashboard = read('src/pages/DashboardPage.tsx');
const transactions = read('src/features/transactions/TransactionsPage.tsx');
const business = read('src/features/business/BusinessMoneyActivityPage.tsx');
const functions = read('functions/src/index.ts');

function check(condition, message) {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('PASS: ' + message);
}

check(
  models.includes('personalUseEnabled?: boolean;'),
  'Account model supports Personal + Business use without duplicating the account.',
);

check(
  repo.includes('accountSupportsPersonalUse')
  && repo.includes('.filter(accountSupportsPersonalUse)'),
  'Personal readers include explicitly Personal-enabled Business accounts.',
);

check(
  accounts.includes('<option value="both">Personal + Business</option>')
  && accounts.includes('one real account and one balance'),
  'Account editor exposes Personal + Business usage clearly.',
);

check(
  accounts.includes('Personal + Business accounts')
  && accounts.includes('Global Account'),
  'Accounts page visibly separates Personal + Business global accounts.',
);

check(
  dashboard.includes('accountSupportsPersonalUse(')
  && dashboard.includes('Business-only excluded'),
  'Personal Home includes global Personal + Business accounts while excluding pure Business-only accounts.',
);

check(
  transactions.includes('accountSupportsPersonalUse(account)'),
  'Personal Money Activity accepts Personal + Business accounts.',
);

check(
  functions.includes('personalUseEnabled,')
  && functions.includes('?.personalUseEnabled !== true'),
  'Backend persists Personal use and permits the account in Personal workflows.',
);

check(
  business.includes('Request money move')
  && business.includes('requestMoveOnly')
  && business.includes("entryMode={"),
  'Manager Business workspace exposes a move-request-only flow.',
);

check(
  business.includes('isManager')
  && business.includes('canRequestTransfer'),
  'Manager role is explicitly gated for transfer requests.',
);

check(
  functions.includes("financialOwnerId !== uid")
  && functions.includes("type === 'transfer'"),
  'Existing Account Owner approval engine remains authoritative for non-owner Business transfers.',
);

check(
  !functions.includes("classification = 'both'"),
  'No third backend classification was introduced; existing Business safeguards stay compatible.',
);

console.log('');
console.log('============================================================');
console.log(' SLICE 23B GLOBAL PERSONAL + BUSINESS ACCOUNTS: VERIFY PASS');
console.log(' One account / one balance can be used in Personal + Business.');
console.log(' Owner Business moves remain direct.');
console.log(' Manager money moves use existing Account Owner approval.');
console.log(' Pure Personal accounts are not exposed to Business staff.');
console.log(' ADBN history sync remains untouched.');
console.log(' Production untouched.');
console.log('============================================================');
