import fs from 'node:fs';

let checks = 0;
function fail(message) { throw new Error(message); }
function read(file) { if (!fs.existsSync(file)) fail(`Missing ${file}`); return fs.readFileSync(file, 'utf8'); }
function need(file, token) { checks += 1; if (!read(file).includes(token)) fail(`Expected ${file} to contain: ${token}`); }
function reject(file, pattern, message) { checks += 1; if (pattern.test(read(file))) fail(message); }

const requiredFiles = [
  'SME_POS_BARCODE_OPERATIONS_ALPHA.md',
  'src/components/SmePosBarcodeLabelDialog.tsx',
  'src/components/SmePosBarcodeReturnScanner.tsx',
  'src/components/SmePosBarcodeInventoryPanel.tsx',
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  'scripts/verify-sme-pos-barcode-operations.mjs',
];
for (const file of requiredFiles) { checks += 1; if (!fs.existsSync(file)) fail(`Missing ${file}`); }

const packageJson = JSON.parse(read('package.json'));
const release = JSON.parse(read('release.json'));
if (packageJson.version !== '1.3.0' || release.version !== '1.3.0') fail('SME barcode operations require version 1.3.0.');
checks += 1;
if (release.label !== 'BajetBN v1.3.0 Alpha 3' || release.channel !== 'alpha') fail('Expected Alpha 3 release metadata.');
checks += 1;
if (packageJson.scripts?.['verify:sme-pos-barcode-operations'] !== 'node scripts/verify-sme-pos-barcode-operations.mjs') fail('Missing SME barcode operations npm verifier.');
checks += 1;
if (!packageJson.scripts?.['verify:all-structural']?.includes('verify-sme-pos-barcode-operations.mjs')) fail('SME barcode operations verifier is not in verify:all-structural.');
checks += 1;

for (const token of [
  'onStocktake?: (item: T) => void;',
  'onPrintLabel?: (item: T) => void;',
  'Count stock',
  'Print label',
]) need('src/components/SmePosBarcodeInventoryPanel.tsx', token);

for (const token of [
  "import('@bwip-js/browser')",
  "bcid: 'code128'",
  "document.body.classList.add('sme-pos-label-printing')",
  'Print labels',
  'No selected',
]) need('src/components/SmePosBarcodeLabelDialog.tsx', token);

for (const token of [
  'BarcodeCameraScanner',
  'sales.flatMap((sale) => sale.items)',
  'sale.status !== \'refunded\'',
  'line.quantity > line.returnedQuantity',
  'It never refunds or changes stock automatically.',
  'Choose the correct receipt',
  'onSelectSale(sale)',
]) need('src/components/SmePosBarcodeReturnScanner.tsx', token);

for (const file of [
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
]) {
  need(file, "import { SmePosBarcodeLabelDialog } from '../../components/SmePosBarcodeLabelDialog';");
  need(file, "import { SmePosBarcodeReturnScanner } from '../../components/SmePosBarcodeReturnScanner';");
  need(file, 'onStocktake={canManageStock ? setStocktakeForm : undefined}');
  need(file, 'stocktake: true');
  need(file, 'Confirm physical count');
  need(file, '<SmePosBarcodeLabelDialog');
  need(file, '<SmePosBarcodeReturnScanner');
  need(file, 'onSelectSale={openReturnForm}');
  reject(file, /onDetected=\{(?:setStocktakeForm|openReturnForm|submitReturn)\}/, `${file} must not connect a raw scan directly to stocktake or return mutation.`);
}

need('src/features/sme-pos/StandardPosWorkspace.tsx', 'getSaleItemId={(item) => item.productId}');
need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', 'getSaleItemId={(item) => item.listingId || item.productId}');
need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', 'Confirm received stock');
need('src/types/models.ts', 'barcode?: string;');
need('functions/src/index.ts', "barcode: String(product.barcode || '')");
need('functions/src/index.ts', "barcode: String(item.listing.barcode || '')");

for (const token of [
  'stocktake?: boolean;',
  'note?: string;',
]) need('src/repositories/smePosRepository.ts', token);

for (const token of [
  'const stocktake = request.data?.stocktake === true;',
  'const previousQuantity = smePosQuantity',
  'const difference = quantityOnHand - previousQuantity;',
  "kind: stocktake ? 'stocktake_sme_pos_product'",
  "kind: stocktake ? 'stocktake_marketplace_listing'",
  "action: stocktake ? 'pos_stocktake_counted'",
  "action: stocktake ? 'marketplace_stocktake_counted'",
]) need('functions/src/index.ts', token);

for (const file of requiredFiles.filter((value) => value.endsWith('.tsx'))) {
  reject(file, /\b(?:window\.)?(?:confirm|alert)\s*\(/, `${file} must not use browser-native confirmation or alert.`);
}

console.log(`SME POS barcode operations Alpha 3 verification passed (${checks} checks).`);
