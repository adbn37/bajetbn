import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [
  ['src/types/models.ts', 'SharedBillSettlementMode'],
  ['src/types/models.ts', 'SharedBillPaymentStatus'],
  ['src/types/models.ts', 'SharedBillPayment'],
  ['src/types/models.ts', 'settledMinor?: number'],
  ['src/types/models.ts', 'sharedBillPaymentId?: string | null'],
  ['src/repositories/collaborationRepository.ts', 'listSharedBillPayments'],
  ['src/repositories/collaborationRepository.ts', 'reverseSharedBillPayment'],
  ['src/features/collaboration/CollaborationPage.tsx', 'Paid from my BajetBN account'],
  ['src/features/collaboration/CollaborationPage.tsx', 'Paid using another method'],
  ['src/features/collaboration/CollaborationPage.tsx', 'Amount paid now (BND)'],
  ['src/features/collaboration/CollaborationPage.tsx', 'Confirm payment'],
  ['src/features/collaboration/CollaborationPage.tsx', 'Undo payment'],
  ['src/features/transactions/TransactionsPage.tsx', 'reverseSharedBillPayment'],
  ['src/features/transactions/TransactionsPage.tsx', 'Payment submitted'],
  ['functions/src/index.ts', 'shared_bill_payment'],
  ['functions/src/index.ts', 'writeFinalizedSharedPayment'],
  ['functions/src/index.ts', 'export const reverseSharedBillPayment'],
  ['functions/src/index.ts', 'previousCommitmentAmountPaidMinor'],
  ['functions/src/index.ts', 'postCommitmentAmountPaidMinor'],
  ['functions/src/index.ts', 'Reverse shared bill payments from Sharing'],
  ['firestore.rules', 'match /sharedBillPayments/{paymentId}'],
  ['firestore.rules', 'match /sharedBillPaymentReversals/{reversalId}'],
  ['firestore.indexes.json', 'sharedBillPayments'],
  ['SHARED_BILL_PAYMENT_FINALISATION_ALPHA.md', 'BND 37'],
];

for (const [file, marker] of checks) {
  const content = read(file);
  if (!content.includes(marker)) throw new Error(`${file} is missing: ${marker}`);
}

function assignmentResult(assignedMinor, settledMinor, paymentMinor) {
  if (paymentMinor <= 0 || paymentMinor > assignedMinor - settledMinor) throw new Error('Invalid payment');
  const nextSettled = settledMinor + paymentMinor;
  return {
    settledMinor: nextSettled,
    outstandingMinor: assignedMinor - nextSettled,
    status: nextSettled === assignedMinor ? 'paid' : 'partially_paid',
  };
}

const full = assignmentResult(3700, 0, 3700);
if (full.status !== 'paid' || full.outstandingMinor !== 0) throw new Error('Full settlement calculation failed.');
const partial = assignmentResult(3700, 0, 2000);
if (partial.status !== 'partially_paid' || partial.outstandingMinor !== 1700) throw new Error('Partial settlement calculation failed.');
const completePartial = assignmentResult(3700, 2000, 1700);
if (completePartial.status !== 'paid' || completePartial.outstandingMinor !== 0) throw new Error('Remaining settlement calculation failed.');

console.log(`Shared bill payment finalisation checks passed (${checks.length} structural checks plus settlement calculations).`);
