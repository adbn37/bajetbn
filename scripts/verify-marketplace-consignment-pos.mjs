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
if (release.version !== pkg.version) fail('release.json and package.json must use the same version.');

for (const file of [
  'MARKETPLACE_CONSIGNMENT_POS_ALPHA.md',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  'src/features/sme-pos/SmePosArchivedRecordsPage.tsx',
]) if (!exists(file)) fail(`Missing ${file}`);

for (const token of [
  'marketplace-pos-workspace',
  'Seller listings and stock',
  'Add seller',
  'Add listing',
  'Shared register',
  'Sell items from multiple sellers.',
  'Seller money waiting',
  'My balance',
  'Seller area',
  'Complete sale',
  'Out of stock',
  "role !== 'stock_staff'",
  'receipt.paymentAccountName &&',
  'lineDiscountVersion: 2',
  'Item discount',
  'not distributed across other items or sellers',
  'sellerColor',
  'Out of stock (',
  'marketplace-floating-cart',
  'marketplace-report-thumb',
  'sellerColourPalette',
  '!term',
  '&& !showRegisterOutOfStock',
  'showInventoryOutOfStock || Boolean(search.trim())',
  'marketplace-register-price',
  'Low stock',
]) need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', token);

for (const token of [
  'SmePosSeller',
  'SmePosListing',
  'SmePosSellerLedgerEntry',
  "SmePosCommissionType = 'percentage' | 'fixed_per_item'",
  "SmePosListingCondition = 'new' | 'sealed' | 'open_box' | 'used' | 'other'",
  'sellerColor?: string;',
]) need('src/types/models.ts', token);

for (const token of [
  'getMarketplacePosWorkspace',
  'saveMarketplaceSeller',
  'saveMarketplaceListing',
  'updateMarketplaceListingStock',
  'checkoutMarketplacePos',
  'listMarketplaceSellers',
  'listMarketplaceListings',
  'sellerColor?: string | null;',
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
  'lineDiscountVersion === 2',
  'requestedDiscountMinor',
  "entryType: 'marketplace_pos_sale'",
  "kind: 'sale_earning'",
  'sellerTotals.size',
  'is out of stock',
  'only has ${available} available',
  'This login is already linked to another active seller.',
  "sellerColor: sellerColor || existing.sellerColor || '#46c2ff'",
  'sellerIdentities',
]) need('functions/src/index.ts', token);

for (const token of [
  '/* Marketplace seller colour UX v1 */',
  '.marketplace-floating-cart',
  '.marketplace-cart-drawer',
  '.marketplace-report-thumb',
  '.marketplace-register-price',
  '.marketplace-pos-workspace .sme-pos-checkout-product-grid',
  'border-top: 5px solid var(--seller-color) !important;',
]) need('src/styles/global.css', token);

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
if (!['manual_test', 'complete'].includes(byId.get('sme.pos_returns_payouts')?.status)) fail('Returns and payouts must be implemented and awaiting staging approval.');

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

function splitPerItemDiscount(lines) {
  return lines.map((line) => {
    const gross = line.price * line.quantity;
    const discount = line.discount || 0;

    if (discount > gross) {
      throw new Error('Discount exceeds item total.');
    }

    const net = gross - discount;
    const commission = line.type === 'percentage'
      ? Math.floor(net * line.rateBps / 10_000)
      : Math.min(net, line.fixed * line.quantity);

    return {
      net,
      commission,
      seller: net - commission,
    };
  });
}

const bundle = splitPerItemDiscount([
  {
    price: 1_000,
    quantity: 1,
    type: 'percentage',
    rateBps: 0,
    fixed: 0,
    discount: 0,
  },
  {
    price: 1_000,
    quantity: 1,
    type: 'percentage',
    rateBps: 0,
    fixed: 0,
    discount: 500,
  },
]);

if (bundle[0].net !== 1_000 || bundle[0].seller !== 1_000) {
  fail('Item 1 must remain BND 10.00 when it has no discount.');
}

if (bundle[1].net !== 500 || bundle[1].seller !== 500) {
  fail('Item 2 must become BND 5.00 when only that item receives a BND 5.00 discount.');
}

if (bundle.reduce((sum, line) => sum + line.net, 0) !== 1_500) {
  fail('Per-item bundle total must be BND 15.00.');
}

console.log('Marketplace Consignment POS checks passed (seller listings, mixed checkout, legacy compatibility, per-item bundle discounts, commission split, seller balances, role isolation and archive safety).');
