import fs from 'node:fs';

const service = fs.readFileSync(
  'src/services/transactionShare.ts',
  'utf8',
);

const page = fs.readFileSync(
  'src/features/transactions/PublicTransactionSharePage.tsx',
  'utf8',
);

const transactions = fs.readFileSync(
  'src/features/transactions/TransactionsPage.tsx',
  'utf8',
);

const dashboard = fs.readFileSync(
  'src/pages/DashboardPage.tsx',
  'utf8',
);

const functions = fs.readFileSync(
  'functions/src/index.ts',
  'utf8',
);

const rules = fs.readFileSync(
  'firestore.rules',
  'utf8',
);

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log('PASS: ' + label);
    return;
  }

  console.error('FAIL: ' + label);
  failures.push(label);
}

const publicPayload =
  service
    .split('export interface PublicTransactionSharePayload')[1]
    ?.split('}')[0]
  || '';

check(
  service.includes('transactionId?: string'),
  'Private runtime carries the source transaction reference.',
);

for (const forbidden of [
  'transactionId',
  'spaceId',
  'accountId',
  'ownerId',
  'sourceAccountName',
  'destinationAccountName',
  'note',
  'receipt',
  'balance',
]) {
  check(
    !publicPayload.includes(forbidden),
    'Public payload excludes ' + forbidden + '.',
  );
}

check(
  publicPayload.includes('shareToken'),
  'Public payload supports an opaque Smart Share token.',
);

check(
  service.includes("'createTransactionShareToken'")
    && service.includes("'resolveTransactionShareTarget'"),
  'Frontend uses authenticated Smart Share Functions.',
);

check(
  functions.includes('export const createTransactionShareToken')
    && functions.includes('export const resolveTransactionShareTarget'),
  'Backend exposes both authenticated Smart Share Functions.',
);

check(
  functions.includes('randomBytes(')
    && functions.includes("'base64url'")
    && functions.includes("'sha256'"),
  'Smart Share uses random opaque tokens with SHA-256 server mapping.',
);

check(
  functions.includes('canReadTransactionShareTarget')
    && functions.includes('ledgerSpaceIds')
    && functions.includes('canViewLedger'),
  'Backend rechecks transaction access before resolving.',
);

check(
  page.includes('useAuth')
    && page.includes('resolveTransactionShareTarget')
    && page.includes('navigate('),
  'Signed-in public page resolves authorised original records.',
);

check(
  page.includes('returnPath')
    && page.includes('from:'),
  'Signed-out Sign In returns to the shared link.',
);

check(
  page.includes("'/transactions?transactionId='")
    && page.includes("'&receipt=1'"),
  'Personal records can open Details or Receipt.',
);

check(
  page.includes("'?section=money'"),
  'Shared Space records open the relevant Space Money section.',
);

check(
  transactions.includes('requestedTransactionId')
    && transactions.includes('requestedReceipt')
    && transactions.includes('setSelectedTransaction(')
    && transactions.includes('setReceiptTransaction('),
  'Money Activity accepts direct Details and Receipt links.',
);

check(
  dashboard.includes('selectedActivity.id'),
  'Home Smart Share supplies the private transaction reference.',
);

check(
  !rules.includes('transactionShareLinks'),
  'Smart Share server mapping remains inaccessible through client Firestore rules.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error('- ' + failure);
  }

  throw new Error(
    'Authenticated transaction deep-link verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  'TRANSACTION AUTHENTICATED DEEP LINK VERIFICATION PASS',
);