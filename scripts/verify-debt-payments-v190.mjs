import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const models =
  read('src/types/models.ts');

const repo =
  read('src/repositories/debtRepository.ts');

const page =
  read('src/features/debt/DebtPage.tsx');

const functions =
  read('functions/src/index.ts');

const checks = [
  [models, 'reversalTransactionId?: string | null;', 'payment reversal audit model'],

  [repo, 'listDebtPayments', 'payment history repository'],
  [repo, 'recordDebtPayment', 'record payment repository'],
  [repo, 'reverseDebtPayment', 'reverse payment repository'],

  [page, 'Record payment', 'record payment UI'],
  [page, 'DebtPaymentHistory', 'payment history UI'],
  [page, 'Received into account', 'owed-to-me account flow'],
  [page, 'Paid from account', 'I-owe account flow'],

  [functions, 'export const recordDebtPayment = onCall', 'payment callable'],
  [functions, 'export const reverseDebtPayment = onCall', 'reversal callable'],
  [functions, 'db.runTransaction', 'atomic Firestore transaction'],
  [functions, 'updateAccountBalance(', 'atomic account balance'],
  [functions, 'createLedgerEntry(', 'ledger posting'],
  [functions, "sourceType: 'debt_payment'", 'linked money activity'],
    [functions, 'nextBalance === 0', 'settlement condition'],
  [functions, "'settled'", 'settled state'],
  [functions, 'settledAt:', 'settlement timestamp'],
  [functions, "status: 'reversed'", 'transaction reversal marking'],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);

  if (!ok) failed += 1;
}

if (failed) {
  console.error(
    `Debt Slice 7B1 verifier failed: ${failed}`,
  );

  process.exit(1);
}

console.log(
  'Debt Slice 7B1 verifier: PASS',
);
