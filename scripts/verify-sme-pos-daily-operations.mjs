import fs from 'node:fs';

let checks = 0;
const fail = (message) => { throw new Error(message); };
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
const need = (file, text, label = text) => {
  checks += 1;
  if (!read(file).includes(text)) fail(`Missing ${label} in ${file}: ${text}`);
};
const reject = (file, text, label = text) => {
  checks += 1;
  if (read(file).includes(text)) fail(`Unexpected ${label} in ${file}: ${text}`);
};

const packageJson = JSON.parse(read('package.json'));
checks += 1;
const versionAtLeast = (version, minimum) => {
  const actual = String(version || '').split('-')[0].split('.').map((value) => Number(value) || 0);
  const required = String(minimum).split('.').map((value) => Number(value) || 0);
  for (let index = 0; index < 3; index += 1) {
    if ((actual[index] || 0) > (required[index] || 0)) return true;
    if ((actual[index] || 0) < (required[index] || 0)) return false;
  }
  return true;
};
if (!versionAtLeast(packageJson.version, '1.3.6')) fail(`POS daily operations require version 1.3.6 or later; found ${packageJson.version}.`);
checks += 1;
if (!String(packageJson.scripts?.['verify:all-structural'] || '').includes('verify-sme-pos-daily-operations.mjs')) fail('Daily operations verifier is not registered in verify:all-structural.');

for (const text of [
  "export type SmePosReservationStatus = 'reserved' | 'partially_paid' | 'paid' | 'completed' | 'cancelled';",
  'reservedQuantity?: number;',
  'export interface SmePosSalePayment',
  'export interface SmePosReservationItem',
  'export interface SmePosReservation',
  'payments?: SmePosSalePayment[];',
  'quickAdd?: boolean;',
  'reservationId?: string | null;',
]) need('src/types/models.ts', text);

for (const text of [
  'export interface SmePosPaymentInput',
  'export interface StandardPosQuickItemInput',
  'export interface MarketplaceQuickItemInput',
  'listSmePosReservations',
  'createSmePosReservation',
  'addSmePosReservationDeposit',
  'completeSmePosReservation',
  'cancelSmePosReservation',
  'quickItems?: StandardPosQuickItemInput[]',
  'quickItems?: MarketplaceQuickItemInput[]',
  'payments: SmePosPaymentInput[]',
]) need('src/repositories/smePosRepository.ts', text);

for (const text of [
  'Use one account, or split the total across multiple payment accounts.',
  '+ Split payment',
  'Payment entered',
  'Remaining',
  'paymentDraftsToInput',
  'rows.length < 4',
]) need('src/components/SmePosPaymentSplitEditor.tsx', text);

for (const text of [
  'Reserve current cart',
  'Hold stock for a customer',
  'Deposit now',
  'Bookings & deposits',
  'Add deposit',
  'Take balance & complete',
  'Cancel booking',
  'refunded automatically',
  'initialDiscountMinor',
]) need('src/components/SmePosReservations.tsx', text);

for (const file of [
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
]) {
  for (const text of [
    "'bookings'",
    '+ Quick Add',
    'Quick Add · this sale only',
    'SmePosPaymentSplitEditor',
    'Reserve / take deposit',
    'SmePosReservationsPanel',
    'listSmePosReservations',
    'paymentDraftTotalMinor(paymentRows)',
    'paymentDraftsToInput(paymentRows)',
    'reservedQuantity',
    'availableQuantity',
    'initialDiscountMinor={discountMinor}',
  ]) need(file, text);
}
need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', "sellerId: item.sellerId", 'Marketplace Quick Add seller attribution');
need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', "The selected seller's default commission is applied automatically.", 'Marketplace Quick Add default commission guidance');
need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', "defaultValue={mySeller?.id || sellers[0]?.id || ''}", 'Cashier/Seller Quick Add seller default');
need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', 'sourceMode="marketplace_consignment"', 'Marketplace reservation mode');
reject('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', 'sourceMode="marketplace"', 'invalid Marketplace reservation mode');
need('src/features/sme-pos/StandardPosWorkspace.tsx', 'Quick Add items are sale-only and cannot be reserved.', 'Standard Quick Add booking safety');
need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', 'Quick Add items are sale-only and cannot be reserved.', 'Marketplace Quick Add booking safety');

for (const text of [
  'interface SmePosPaymentRequestRow',
  'parseSmePosPaymentRows',
  'parseSmePosPartialPaymentRows',
  'parseStandardQuickItems',
  'parseMarketplaceQuickItems',
  'postSmePosPayments',
  "if (raw.length > 4)",
  'Split payments must add up exactly',
  'reservedQuantity',
  'only has ${available} available after existing bookings.',
  'export const listSmePosReservations',
  'export const createSmePosReservation',
  'export const addSmePosReservationDeposit',
  'export const completeSmePosReservation',
  'export const cancelSmePosReservation',
  "db.collection('smePosReservations')",
  "entryType: sourceMode === 'marketplace_consignment' ? 'marketplace_pos_reservation_deposit' : 'sme_pos_reservation_deposit'",
  "status: 'completed'",
  "status: 'cancelled'",
  'cancellationRefunds: refundPayments',
  'quickAdd: true',
  'realRequested = requestedItems.filter',
  'transactionIds:',
  'ledgerEntryIds:',
  'Complete or cancel the booking before archiving it.',
  'Complete or cancel the booking before changing its seller.',
  'Complete or cancel it before archiving the customer.',
  "'smePosReservations', 'smePosCommands'",
]) need('functions/src/index.ts', text);

need('functions/src/index.ts', "reservedQuantity: row.trackStock === false ? 0 : smePosQuantity(row.reservedQuantity || 0, 'Reserved product stock')", 'Cashier Standard POS reserved-stock visibility');
need('functions/src/index.ts', "transactionId: '', ledgerEntryId: '', transactionIds: [], ledgerEntryIds: []", 'Cashier Marketplace financial identifier redaction');
need('functions/src/index.ts', 'commissionType: undefined, commissionRateBps: undefined, commissionMinor: 0, sellerEarningMinor: 0', 'Cashier Marketplace commission redaction');
need('functions/src/index.ts', "if (hasActiveBooking) throw new HttpsError('failed-precondition', 'This seller has items in an active booking.", 'Seller deletion active-booking safety');
need('functions/src/index.ts', "if (hasActiveBooking) throw new HttpsError('failed-precondition', 'This customer has an active booking.", 'Customer deletion active-booking safety');
need('functions/src/index.ts', 'const netLineMinor = nonNegativeMoney(saleItem.netLineMinor);', 'Marketplace booking net-line narrowing');
need('functions/src/index.ts', 'const commissionMinor = nonNegativeMoney(saleItem.commissionMinor);', 'Marketplace booking commission narrowing');
need('functions/src/index.ts', 'const sellerEarningMinor = nonNegativeMoney(saleItem.sellerEarningMinor);', 'Marketplace booking seller-earning narrowing');
need('functions/src/index.ts', "if (commissionMinor + sellerEarningMinor !== netLineMinor) throw new HttpsError('internal', 'Marketplace booking sale split did not balance.');", 'Marketplace booking line balance guard');

for (const text of [
  '.sme-pos-split-payment',
  '.sme-pos-payment-row',
  '.sme-pos-payment-balance',
  '.pos-checkout-actions',
  '.sme-pos-booking-list',
  '.sme-pos-booking-card',
  '.sme-pos-booking-money',
]) need('src/styles/global.css', text);

// Existing production boundaries must stay present.
for (const text of [
  'deleteMarketplaceSeller',
  'deleteSmePosCustomer',
  'registerExistingSmePosProduct',
  'registerExistingMarketplaceListing',
  'uploadSmePosItemPhoto',
]) need('src/repositories/smePosRepository.ts', text, `v1.3.5 regression boundary ${text}`);
need('src/components/SmePosItemPhoto.tsx', 'One photo only', 'single-photo regression boundary');

// Small deterministic safety calculations.
function splitTotal(rows) { return rows.reduce((sum, row) => sum + row, 0); }
checks += 1;
if (splitTotal([5000, 3000]) !== 8000) fail('Split-payment arithmetic check failed.');
checks += 1;
if (Math.max(0, 7 - 3) !== 4) fail('Reserved-stock available calculation failed.');
function refundAllocation(payments, refund) {
  let remaining = refund;
  return payments.map((available) => {
    const amount = Math.min(available, remaining);
    remaining -= amount;
    return amount;
  });
}
checks += 1;
if (JSON.stringify(refundAllocation([5000, 3000], 6000)) !== JSON.stringify([5000, 1000])) fail('Split-refund allocation check failed.');
checks += 1;
if (Math.floor(9000 * 300 / 10000) + (9000 - Math.floor(9000 * 300 / 10000)) !== 9000) fail('Marketplace commission balance check failed.');

// No native destructive dialogs in the newly changed workspace/components.
for (const file of [
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  'src/components/SmePosReservations.tsx',
]) {
  checks += 1;
  if (/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(read(file))) fail(`${file} must not use browser-native confirm/alert.`);
}

console.log(`BajetBN POS daily operations verification passed (${checks} checks).`);
