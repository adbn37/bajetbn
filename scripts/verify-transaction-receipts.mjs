import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (file, token) => {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
  if (!read(file).includes(token)) throw new Error(`Expected ${file} to contain: ${token}`);
};

requireText('src/types/models.ts', 'export interface TransactionAttachment');
requireText('src/repositories/transactionRepository.ts', "where('ownerId', '==', uid)");
requireText('src/repositories/transactionRepository.ts', 'uploadTransactionAttachment');
requireText('src/repositories/transactionRepository.ts', 'users/${uid}/transaction-receipts/${input.transactionId}');
requireText('src/repositories/transactionRepository.ts', 'removeTransactionAttachment');
requireText('src/features/transactions/TransactionsPage.tsx', 'Receipts & documents');
requireText('src/features/transactions/TransactionsPage.tsx', 'attachments.length}/5');
requireText('src/features/transactions/TransactionsPage.tsx', 'Connect to the internet to add or remove receipts');
requireText('functions/src/index.ts', 'export const registerTransactionAttachment');
requireText('functions/src/index.ts', 'A money activity can have up to five attachments.');
requireText('functions/src/index.ts', 'export const removeTransactionAttachment');
requireText('functions/src/index.ts', "'transactionAttachments'");
requireText('firestore.rules', 'match /transactionAttachments/{attachmentId}');
requireText('storage.rules', 'users/{uid}/transaction-receipts');
requireText('TRANSACTION_RECEIPTS_ALPHA.md', 'Financial values, Account balances, Budget totals and reversals are not changed');
requireText('FINAL_SCOPE_AUDIT.md', '2026-08-03 scope expansion');
requireText('PRODUCTION_READINESS_GATE.md', 'Current decision: NO-GO');

const scope = JSON.parse(read('scope/pre-v1-scope.json'));
const receipt = scope.items.find((item) => item.id === 'data.general_receipts');
if (receipt?.status !== 'manual_test' || receipt?.gate !== 'pre_v1') throw new Error('Receipt scope item is not registered as a pre-v1 staging-test gate.');
const missing = scope.items.filter((item) => item.status === 'missing');
const allowedMissing = new Set(['sme.shop_pilot']);
const unexpectedMissing = missing.filter((item) => !allowedMissing.has(item.id));
if (unexpectedMissing.length) throw new Error(`Unexpected missing scope items remain: ${unexpectedMissing.map((item) => item.id).join(', ')}`);
for (const id of allowedMissing) if (!missing.some((item) => item.id === id)) throw new Error(`${id} must remain explicit until the SME POS release sequence is complete.`);
const returnsAndPayouts = scope.items.find((item) => item.id === 'sme.pos_returns_payouts');
if (!returnsAndPayouts || !['missing', 'partial'].includes(returnsAndPayouts.status)) throw new Error('sme.pos_returns_payouts must remain an explicit incomplete POS gate until v0.11.16 is staging passed.');
for (const id of ['collab.household_fund', 'sme.essentials', 'insights.financial_health', 'pwa.offline_mutations']) {
  if (scope.items.find((item) => item.id === id)?.status !== 'complete') throw new Error(`${id} must reflect the confirmed staging pass.`);
}

console.log('Final scope and transaction receipt checks passed (attachments, privacy cleanup and release gate).');
