import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n?/g, '\n');
const fail = (message) => { throw new Error(message); };
const need = (file, token, label = token) => {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing ${file}`);
  if (!read(file).includes(token)) fail(`Missing ${label}: ${token}`);
};
const reject = (file, token, label = token) => {
  if (read(file).includes(token)) fail(`Unexpected ${label}: ${token}`);
};

const pkg = JSON.parse(read('package.json'));
if (pkg.version !== '1.3.5') fail(`Expected package version 1.3.5, found ${pkg.version}.`);

for (const file of [
  'src/components/SmePosItemPhoto.tsx',
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  'src/repositories/smePosRepository.ts',
  'src/types/models.ts',
  'functions/src/index.ts',
  'storage.rules',
]) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing ${file}`);
}

for (const token of [
  'Take photo',
  'Upload photo',
  'One photo only',
  'getSmePosItemPhotoUrl',
]) need('src/components/SmePosItemPhoto.tsx', token);

for (const token of [
  '+ Register item',
  'Register existing stock',
  'Existing stock registered and added to Inventory.',
  'Barcode is optional.',
  'SmePosItemPhotoField',
  'Delete this customer?',
  "role !== 'cashier' && <label>Cost price",
]) need('src/features/sme-pos/StandardPosWorkspace.tsx', token);

for (const token of [
  '+ Register item',
  'Register existing seller stock',
  "hasSellerProfile && !tabs.includes('balance')",
  'A Manager, Cashier, Stock Staff, Viewer or Seller-only user can also own this seller profile.',
  'Delete this seller?',
  'Delete this customer?',
  'SmePosItemPhotoField',
]) need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', token);

reject('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', 'Archive this seller?', 'active seller Archive action');
reject('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', 'Archive this customer?', 'active customer Archive action');
reject('src/features/sme-pos/StandardPosWorkspace.tsx', 'Archive this customer?', 'active customer Archive action');

for (const token of [
  'uploadSmePosItemPhoto',
  'getSmePosItemPhotoUrl',
  'deleteSmePosItemPhoto',
  'registerExistingSmePosProduct',
  'registerExistingMarketplaceListing',
  'deleteMarketplaceSeller',
  'deleteSmePosCustomer',
  'mySellerLedger',
  '!item.sellerDeletedAt',
]) need('src/repositories/smePosRepository.ts', token);

for (const token of [
  'photoPath?: string | null',
  "SmePosStockSource = 'catalog' | 'existing_stock'",
  'deletedAt?: Timestamp | null',
  'sellerDeletedAt?: Timestamp | null',
]) need('src/types/models.ts', token);

for (const token of [
  'export const registerExistingSmePosProduct',
  'export const registerExistingMarketplaceListing',
  'export const deleteMarketplaceSeller',
  'export const deleteSmePosCustomer',
  "stockSource: 'existing_stock'",
  "registeredBy: uid",
  "action: 'pos_existing_stock_registered'",
  "action: 'marketplace_existing_stock_registered'",
  "await requireSmePosActor(spaceId, uid, ['owner']);",
  'Settle this seller’s balance before deleting the seller profile.',
  "['manager', 'cashier', 'stock_staff', 'seller', 'viewer']",
  'Their staff role stays unchanged when they are linked as a seller.',
  'Deleted sellers cannot be restored.',
  'Deleted customers cannot be restored.',
  'mySellerLedger',
  'smePosItemPhotoPath',
  'sellerDeletedAt: now',
  "context.role === 'cashier' ? null : requestedCostPriceMinor",
]) need('functions/src/index.ts', token);

for (const token of [
  'canManageSmePosItemPhoto',
  'canReadSmePosItemPhoto',
  'match /spaces/{spaceId}/sme-pos-items/{fileName}',
  "['manager', 'cashier', 'stock_staff']",
  "request.resource.contentType.matches('image/.*')",
]) need('storage.rules', token);

if (read('src/features/collaboration/CollaborationPage.tsx').includes('Register existing stock')) {
  fail('Invitation/collaboration flow was unexpectedly modified by the POS hotfix.');
}

console.log('BajetBN v1.3.5 POS operations hotfix verification passed.');
