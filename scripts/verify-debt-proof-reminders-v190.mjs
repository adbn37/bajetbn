import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const models =
  read('src/types/models.ts');

const repo =
  read('src/repositories/debtRepository.ts');

const page =
  read('src/features/debt/DebtPage.tsx');

const storage =
  read('storage.rules');

const functions =
  read('functions/src/index.ts');

const checks = [
  [models, 'proofFileName?: string | null;', 'proof metadata model'],

  [repo, 'uploadDebtPaymentProof', 'proof upload repository'],
  [repo, 'getDebtPaymentProofUrl', 'proof view repository'],
  [repo, 'removeDebtPaymentProof', 'proof remove repository'],
  [repo, 'users/${uid}/debt-payment-proofs/', 'private proof path'],

  [page, 'Attach proof', 'attach proof UI'],
  [page, 'View proof', 'view proof UI'],
  [page, 'Remove proof', 'remove proof UI'],

  [storage, 'match /users/{uid}/{allPaths=**}', 'private user Storage rule'],
  [storage, 'isImageOrPdf()', 'image/PDF Storage validation'],
  [storage, 'underTenMb()', '10 MB Storage limit'],

  [functions, 'export const setDebtPaymentProof = onCall', 'proof register callable'],
  [functions, 'export const removeDebtPaymentProof = onCall', 'proof remove callable'],
  [functions, 'payment.ownerId !== uid', 'proof owner validation'],
  [functions, 'debt-payment-proofs/${paymentId}/', 'proof path validation'],

  [functions, "type BackgroundReminderItemType = 'bill' | 'instalment' | 'goal' | 'debt';", 'Debt reminder type'],
  [functions, "itemType: 'debt'", 'Debt reminder candidates'],
  [functions, "db.collection('debts').where('ownerId', '==', uid).get()", 'Debt reminder query'],
  [functions, "item.reminderEnabled === false", 'Debt reminder opt-out'],
  [functions, "item.status !== 'active'", 'settled Debt reminder suppression'],
  [functions, "input.itemType === 'debt'", 'Debt reminder copy'],
  [functions, "? '/debt'", 'Debt reminder target'],
  [functions, 'sendBrowserPush(uid, created)', 'existing push delivery'],
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
    `Debt Slice 7B2 verifier failed: ${failed}`,
  );

  process.exit(1);
}

console.log(
  'Debt Slice 7B2 verifier: PASS',
);
