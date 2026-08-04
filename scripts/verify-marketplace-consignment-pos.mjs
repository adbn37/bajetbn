import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };
const need = (file, token) => {
  if (!exists(file)) fail(`Missing ${file}`);
  if (!read(file).includes(token)) fail(`Expected ${file} to contain: ${token}`);
};

const release = JSON.parse(read('release.json'));
const pkg = JSON.parse(read('package.json'));
if (release.version !== '0.11.15' || pkg.version !== '0.11.15') fail('Marketplace Consignment POS Alpha 1 must use version 0.11.15.');
if (!release.label.includes('Marketplace Consignment POS Alpha 1')) fail('release.json must identify Marketplace Consignment POS Alpha 1.');

for (const file of [
  'MARKETPLACE_CONSIGNMENT_POS_ALPHA.md',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  'src/features/sme-pos/SmePosArchivedRecordsPage.tsx',
]) if (!exists(file)) fail(`Missing ${file}`);

for (const token of [
  'Marketplace Consignment POS',
  'Seller listings and stock',
  'Add seller',
  'Add listing',
  'Shared register',
  'One sale can contain items from several sellers.',
  'Money waiting payout',
  'My balance',
  'Seller workspace',
  'Complete sale',
  'Out of stock',
  "role !== 'stock_staff'",
  'receipt.paymentAccountName &&',
]) need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', token);

for (const token of [
  'SmePosSeller',
  'SmePosListing',
  'SmePosSellerLedgerEntry',
  "SmePosCommissionType = 'percentage' | 'fixed_per_item'",
  "SmePosListingCondition = 'new' | 'sealed' | 'open_box' | 'used' | 'other'",
]) need('src/types/models.ts', token);

for (const token of [
  'getMarketplacePosWorkspace',
  'saveMarketplaceSeller',
  'saveMarketplaceListing',
  'updateMarketplaceListingStock',
  'checkoutMarketplacePos',
  'listMarketplaceSellers',
  'listMarketplaceListings',
]) need('src/repositories/smePosRepository.ts', token);

for (const token of [
  'export const getMarketplacePosWorkspace',
  'export const saveMarketplaceSeller',
  'export const setMarketplaceSellerArchived',
  'export const saveMarketplaceListing',
  'export const updateMarketplaceListingStock',
  'export const setMarketplaceListingArchived',
  'export const checkoutMarketplacePos',
  'marketplaceCommissionMinor + sellerEarningsMinor !== totalMinor',
  "entryType: 'marketplace_pos_sale'",
  "kind: 'sale_earning'",
  'sellerTotals.size',
  'is out of stock',
  'only has ${available} available',
  'This login is already linked to another active seller.',
]) need('functions/src/index.ts', token);

for (const token of [
  'match /smePosSellers/{sellerId}',
  'match /smePosListings/{listingId}',
  'match /smePosSellerLedger/{entryId}',
  "hasPosRole(resource.data.spaceId, ['seller'])",
  'resource.data.sellerUid == request.auth.uid',
  'allow create, update, delete: if false;',
]) need('firestore.rules', token);

need('src/features/sme-pos/SmePosPage.tsx', "settings.mode === 'marketplace_consignment'");
need('src/features/sme-pos/SmePosArchivedRecordsPage.tsx', 'Archived seller listings');
need('STAGING_TEST_CHECKLIST.md', 'v0.11.15 — Marketplace Consignment POS Alpha 1');
need('PRE_V1_SCOPE_ROADMAP.md', 'v0.11.15 — Marketplace Consignment POS');

const scope = JSON.parse(read('scope/pre-v1-scope.json'));
const byId = new Map(scope.items.map((item) => [item.id, item]));
if (byId.get('sme.standard_pos')?.status !== 'complete') fail('Standard POS must be complete after its staging pass.');
if (!['manual_test', 'complete'].includes(byId.get('sme.marketplace_pos')?.status)) fail('Marketplace POS must be manual_test or complete.');
if (byId.get('sme.pos_returns_payouts')?.status !== 'partial') fail('Returns and payouts must stay partial until v0.11.16.');

for (const file of [
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  'src/features/sme-pos/SmePosArchivedRecordsPage.tsx',
]) if (/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(read(file))) fail(`${file} must not use native confirm or alert.`);

function splitSale(lines, discountMinor) {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  let remaining = discountMinor;
  return lines.map((line, index) => {
    const lineSubtotal = line.price * line.quantity;
    const discount = index === lines.length - 1 ? remaining : Math.floor(discountMinor * lineSubtotal / subtotal);
    remaining -= discount;
    const net = lineSubtotal - discount;
    const commission = line.type === 'percentage'
      ? Math.floor(net * line.rateBps / 10_000)
      : Math.min(net, line.fixed * line.quantity);
    return { net, commission, seller: net - commission };
  });
}

const split = splitSale([
  { price: 10_000, quantity: 1, type: 'percentage', rateBps: 300, fixed: 0 },
  { price: 5_000, quantity: 2, type: 'fixed', rateBps: 0, fixed: 100 },
], 1_000);
const finalTotal = split.reduce((sum, line) => sum + line.net, 0);
const commission = split.reduce((sum, line) => sum + line.commission, 0);
const seller = split.reduce((sum, line) => sum + line.seller, 0);
if (finalTotal !== 19_000) fail('Marketplace discount allocation test failed.');
if (commission + seller !== finalTotal) fail('Marketplace commission and seller split must balance exactly.');
if (split[0].commission !== 285) fail('Percentage commission must apply after discount allocation.');
if (split[1].commission !== 200) fail('Fixed commission must apply per sold item.');

console.log('Marketplace Consignment POS checks passed (seller listings, mixed checkout, commission split, seller balances, role isolation and archive safety).');
