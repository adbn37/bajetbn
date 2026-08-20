import fs from 'node:fs';

let checks = 0;
function fail(message) { throw new Error(message); }
function read(file) { if (!fs.existsSync(file)) fail(`Missing ${file}`); return fs.readFileSync(file, 'utf8'); }
function need(file, token) { checks += 1; if (!read(file).includes(token)) fail(`Expected ${file} to contain: ${token}`); }
function reject(file, pattern, message) { checks += 1; if (pattern.test(read(file))) fail(message); }

const requiredFiles = [
  'SME_POS_BARCODE_INVENTORY_ALPHA.md',
  'SME_POS_BARCODE_CHECKOUT_ALPHA.md',
  'src/components/BarcodeCameraScanner.tsx',
  'src/components/SmePosBarcodeInventoryPanel.tsx',
  'src/components/SmePosBarcodeCheckoutScanner.tsx',
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  'scripts/verify-sme-pos-barcode-checkout.mjs',
];
for (const file of requiredFiles) { checks += 1; if (!fs.existsSync(file)) fail(`Missing ${file}`); }

const packageJson = JSON.parse(read('package.json'));
const release = JSON.parse(read('release.json'));
const versionAtLeast = (version, minimum) => {
  const actual = String(version || '').split('-')[0].split('.').map((value) => Number(value) || 0);
  const required = String(minimum).split('.').map((value) => Number(value) || 0);
  for (let index = 0; index < 3; index += 1) {
    if ((actual[index] || 0) > (required[index] || 0)) return true;
    if ((actual[index] || 0) < (required[index] || 0)) return false;
  }
  return true;
};
if (!versionAtLeast(packageJson.version, '1.3.0') || !versionAtLeast(release.version, '1.3.0')) fail('SME barcode checkout requires version 1.3.0 or later.');
checks += 1;
const isCompatibleRelease =
  ['alpha', 'stable'].includes(release.channel)
  && /^BajetBN v\d+\.\d+\.\d+/.test(String(release.label || ''));
if (!isCompatibleRelease) fail('Expected compatible SME barcode checkout release metadata.');
checks += 1;
if (packageJson.scripts?.['verify:sme-pos-barcode-checkout'] !== 'node scripts/verify-sme-pos-barcode-checkout.mjs') fail('Missing SME barcode checkout npm verifier.');
checks += 1;
if (!packageJson.scripts?.['verify:all-structural']?.includes('verify-sme-pos-barcode-checkout.mjs')) fail('SME barcode checkout verifier is not in verify:all-structural.');
checks += 1;

for (const token of [
  'BarcodeCameraScanner',
  'rapidRepeatWindowMs = 1200',
  'cartQuantities: Record<string, number>',
  'lastAcceptedRef',
  "event.key !== 'Enter'",
  'event.preventDefault()',
  'currentQuantity >= cartLimit',
  "match.trackStock === false ? 9999 : match.quantityOnHand",
  'Rapid duplicate scan ignored',
  'No item was added.',
  'added to cart. Cart quantity:',
  'Stock changes only when the sale is completed.',
]) need('src/components/SmePosBarcodeCheckoutScanner.tsx', token);

for (const file of [
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
]) {
  need(file, "import { SmePosBarcodeCheckoutScanner } from '../../components/SmePosBarcodeCheckoutScanner';");
  need(file, '<SmePosBarcodeCheckoutScanner');
  need(file, 'cartQuantities={cart}');
  need(file, 'onAdd={addToCart}');
  need(file, "settings.status !== 'active'");
  reject(file, /onDetected=\{addToCart\}/, `${file} must not connect raw camera detections directly to cart mutation.`);
}

need('src/features/sme-pos/StandardPosWorkspace.tsx', 'itemLabel="product"');
need('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', 'itemLabel="listing"');
need('src/components/SmePosBarcodeInventoryPanel.tsx', 'Scanning searches only.');
need('functions/src/index.ts', 'export const checkoutStandardPos');
need('functions/src/index.ts', 'export const checkoutMarketplacePos');

for (const file of [
  'src/components/SmePosBarcodeCheckoutScanner.tsx',
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
]) reject(file, /\b(?:window\.)?(?:confirm|alert)\s*\(/, `${file} must not use browser-native confirmation or alert.`);

console.log(`SME POS barcode checkout Alpha 2 verification passed (${checks} checks).`);
