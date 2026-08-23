import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const models =
  read('src/types/models.ts');

const repo =
  read('src/repositories/debtRepository.ts');

const page =
  read('src/features/debt/DebtPage.tsx');

const app =
  read('src/app/App.tsx');

const nav =
  read('src/services/personalisation.ts');

const rules =
  read('firestore.rules');

const functions =
  read('functions/src/index.ts');

const checks = [
  [models, 'export interface DebtRecord', 'Debt model'],
  [models, "export type DebtDirection = 'owe' | 'owed'", 'Debt direction'],
  [models, 'export interface DebtPayment', 'Payment-ready model'],

  [repo, 'listDebts', 'Debt listing'],
  [repo, 'createDebt', 'Debt create'],
  [repo, 'archiveDebt', 'Debt archive'],

  [page, 'I Owe', 'I Owe tab'],
  [page, 'Owed to Me', 'Owed to Me tab'],
  [page, 'Net position', 'Debt summary'],
  [page, '+ Add debt', 'Add debt action'],
  [page, 'interestType', 'Interest UI'],
  [page, 'reminderEnabled', 'Reminder flag'],
  [page, 'spaceId', 'Space link'],

  [app, 'path="debt"', 'Debt route'],

  [nav, "id: 'debt'", 'Debt navigation'],
  [nav, "debt: '⇄'", 'Debt visual icon'],

  [rules, 'match /debts/{debtId}', 'Debt rules'],
  [rules, 'match /debtPayments/{paymentId}', 'Payment rules'],

  [functions, 'export const createDebt = onCall', 'Create callable'],
  [functions, 'export const archiveDebt = onCall', 'Archive callable'],
  [functions, "currency: 'BND'", 'BND currency'],
  [functions, 'balanceMinor: totalMinor', 'Initial balance'],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!ok) failed += 1;
}

if (failed) {
  console.error(
    `Debt Slice 7A verifier failed: ${failed}`,
  );

  process.exit(1);
}

console.log(
  'Debt Slice 7A verifier: PASS',
);
