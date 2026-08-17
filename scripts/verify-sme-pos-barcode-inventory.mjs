import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };
let checks = 0;
const need = (file, token) => {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing ${file}`);
  if (!read(file).includes(token)) fail(`Expected ${file} to contain: ${token}`);
  checks += 1;
};

const pkg = JSON.parse(read('package.json'));
const release = JSON.parse(read('release.json'));
if (pkg.version !== '1.3.0' || release.version !== '1.3.0') fail('SME barcode inventory requires version 1.3.0.');
checks += 1;

for (const token of [
  'barcode?: string;',
  'interface SmePosProduct',
  'interface SmePosListing',
]) need('src/types/models.ts', token);

for (const token of [
  'SmePosBarcodeInventoryPanel',
  'Scanning searches only.',
  'No quantity was added by this scan.',
  'Receive stock',
  'Find barcode',
]) need('src/components/SmePosBarcodeInventoryPanel.tsx', token);

for (const file of [
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
]) {
  need(file, '<SmePosBarcodeInventoryPanel');
  need(file, 'Barcode (optional)');
  need(file, 'Confirm received stock');
  need(file, 'Update stock');
}

for (const token of [
  'receiveSmePosProductStock',
  'receiveMarketplaceListingStock',
  'barcode?: string;',
]) need('src/repositories/smePosRepository.ts', token);

for (const token of [
  'function smePosBarcode',
  'assertUniqueSmePosBarcode',
  'including archived records',
  'export const receiveSmePosProductStock',
  'export const receiveMarketplaceListingStock',
  "kind: 'receive_sme_pos_product_stock'",
  "kind: 'receive_marketplace_listing_stock'",
  "action: 'pos_stock_received'",
  "action: 'marketplace_stock_received'",
]) need('functions/src/index.ts', token);

for (const file of [
  'src/components/SmePosBarcodeInventoryPanel.tsx',
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
]) {
  if (/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(read(file))) fail(`${file} must not use browser-native confirm or alert.`);
  checks += 1;
}

const standard = read('src/features/sme-pos/StandardPosWorkspace.tsx');
const marketplace = read('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx');
if (/onDetected=.*(?:update|receive)/.test(standard + marketplace)) fail('Barcode detection must not mutate stock automatically.');
checks += 1;

console.log(`SME POS barcode inventory Alpha 1 verification passed (${checks} checks).`);
