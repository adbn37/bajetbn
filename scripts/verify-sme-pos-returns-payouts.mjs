import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };
const need = (file, token) => {
  if (!exists(file)) fail(`Missing ${file}`);
  if (!read(file).includes(token)) fail(`Expected ${file} to contain: ${token}`);
};

for (const file of [
  'SME_POS_RETURNS_PAYOUTS_ALPHA.md',
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  'src/repositories/smePosRepository.ts',
  'functions/src/index.ts',
  'firestore.rules',
]) if (!exists(file)) fail(`Missing ${file}`);

for (const token of [
  'SmePosReturnItem',
  'SmePosReturn',
  'SmePosPayout',
  'commissionReturnedMinor',
  'sellerEarningReturnedMinor',
]) need('src/types/models.ts', token);

for (const token of [
  'returnSmePosSale',
  'recordMarketplaceSellerPayout',
]) need('src/repositories/smePosRepository.ts', token);

for (const token of [
  'export const returnSmePosSale',
  'export const recordMarketplaceSellerPayout',
  "entryType: sourceMode === 'marketplace_consignment' ? 'marketplace_pos_refund' : 'sme_pos_refund'",
  "entryType: 'marketplace_seller_payout'",
  "kind: 'return_adjustment'",
  "kind: 'payout'",
  "status: fullyReturned ? 'refunded' : 'partially_returned'",
  'FieldValue.arrayUnion(returnRef.id)',
  "transaction.create(returnRef",
  "transaction.create(payoutRef",
  "const paymentRows = parseSmePosPaymentRows(request.data || {}, amountMinor);",
  "const postedPayments = await postSmePosPayments({",
  "categoryId: 'expense-supplier'",
  "paymentSourceLabels: sourceLabels",
  "createdByName: context.member.displayName",
  "transaction.create(commandRef, { uid, kind: 'return_sme_pos_sale'",
  "transaction.create(commandRef, { uid, kind: 'record_marketplace_seller_payout'",
]) need('functions/src/index.ts', token);

for (const token of [
  'Return items',
  'Confirm return and refund',
]) need('src/features/sme-pos/StandardPosWorkspace.tsx', token);

for (const token of [
  'Return items',
  'Pay seller',
  'Paid From',
  'Confirm seller payout',
  'Recent seller payouts',
  'Seller owes shop',
  'Split payouts can use up to four sources.',
]) need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', token);

for (const token of [
  'match /smePosReturns/{returnId}',
  'match /smePosPayouts/{payoutId}',
  'allow create, update, delete: if false;',
]) need('firestore.rules', token);

for (const file of [
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
]) {
  if (/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(read(file))) fail(`${file} must not use native confirm or alert.`);
}

const scope = JSON.parse(read('scope/pre-v1-scope.json'));
const byId = new Map(scope.items.map((item) => [item.id, item]));
for (const id of ['sme.pos_money_link', 'sme.pos_returns_payouts']) {
  if (!['manual_test', 'complete'].includes(byId.get(id)?.status)) fail(`${id} must be implemented and awaiting staging approval.`);
}

function cumulativeShare(total, quantity, returned) {
  if (returned <= 0) return 0;
  if (returned >= quantity) return total;
  return Math.floor(total * returned / quantity);
}

const total = 10_001;
const first = cumulativeShare(total, 3, 1);
const second = cumulativeShare(total, 3, 2) - cumulativeShare(total, 3, 1);
const third = cumulativeShare(total, 3, 3) - cumulativeShare(total, 3, 2);
if (first + second + third !== total) fail('Partial-return rounding must reach the exact original line total.');

const commission = 301;
const firstCommission = cumulativeShare(commission, 3, 1);
const secondCommission = cumulativeShare(commission, 3, 2) - cumulativeShare(commission, 3, 1);
const thirdCommission = cumulativeShare(commission, 3, 3) - cumulativeShare(commission, 3, 2);
if (firstCommission + secondCommission + thirdCommission !== commission) fail('Commission reversal rounding must reach the exact original commission.');

const sellerEarnings = total - commission;
const sellerReversal = (first - firstCommission) + (second - secondCommission) + (third - thirdCommission);
if (sellerReversal !== sellerEarnings) fail('Seller return adjustments must balance against net line amount and commission.');

console.log('SME POS returns and seller payout checks passed (return quantities, exact rounding, stock restoration, refund posting, seller balance reversals, payouts, permissions and audit records).');
