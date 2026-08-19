import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
const need = (text, token, label) => {
  if (!text.includes(token)) throw new Error(`Missing ${label}: ${token}`);
};
const reject = (text, token, label) => {
  if (text.includes(token)) throw new Error(`Unsafe ${label}: ${token}`);
};

const pkg = JSON.parse(read('package.json'));
if (pkg.version !== '1.3.10') throw new Error(`Expected package version 1.3.10, found ${pkg.version}.`);

const workspace = read('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx');
let checks = 0;
const must = (token, label) => { need(workspace, token, label); checks += 1; };
const mustNot = (token, label) => { reject(workspace, token, label); checks += 1; };

must("import { BarcodeCameraScanner } from '../../components/BarcodeCameraScanner';", 'shared camera scanner import');
must("function lookupManualListingBarcode(rawBarcode: string, sellerId = manualListingSelectedSellerId)", 'seller-scoped barcode lookup');
must("item.barcode?.trim().toLowerCase() === normalized", 'normalized barcode matching');
must("matches.find((item) => item.sellerId === sellerId)", 'same-seller match preference');
must("Name, category and SKU were copied as a starting point.", 'cross-seller safe copy explanation');
must("keeps a separate seller listing with its own price, condition and commission.", 'seller identity boundary');
must('startLabel="Scan barcode"', 'camera scanner inside register-existing-stock modal');
must('Use the phone camera, a USB barcode scanner, or type the code.', 'camera/USB/manual guidance');
must('onDetected={(barcode) => lookupManualListingBarcode(barcode, manualListingSelectedSellerId)}', 'camera detection lookup');
must('onKeyDown={(event) => { if (event.key === \'Enter\')', 'USB scanner Enter handling');
must('>Find item</button>', 'manual barcode lookup action');
must("const existingListing = normalizedBarcode", 'save-time duplicate guard');
must("item.sellerId === sellerId && item.barcode?.trim().toLowerCase() === normalizedBarcode", 'seller + barcode duplicate identity');
must('await receiveMarketplaceListingStock({', 'existing-item stock receipt path');
must("note: String(form.get('note') || '') || 'Added from Register item barcode lookup'", 'receipt audit note');
must('Existing item found by barcode. Added ${quantityReceived} unit(s)', 'existing-item success message');
must("await registerExistingMarketplaceListing({", 'new seller listing path retained');
must("manualListingExistingMatch ? 'Quantity to add' : 'Quantity on hand'", 'quantity semantics');
must("manualListingExistingMatch ? 'Add stock to existing item'", 'existing stock submit action');
must("Saving records a stock receipt and does not create a duplicate listing.", 'duplicate-prevention user copy');
must("defaultValue={manualListingPrefill?.name || ''}", 'name autofill');
must("defaultValue={manualListingPrefill?.category || ''}", 'category autofill');
must("defaultValue={manualListingPrefill?.sku || ''}", 'SKU autofill');
must("defaultValue={manualListingExistingMatch ? (manualListingExistingMatch.sellingPriceMinor / 100).toFixed(2) : ''}", 'same-seller price autofill');
must("defaultValue={manualListingExistingMatch?.lowStockLevel ?? 1}", 'same-seller low-stock autofill');
must("setManualListingCondition(sameSellerMatch.condition);", 'same-seller condition autofill');
must("setManualListingPhotoFile(null);", 'photo reset before lookup');
must("Existing item photo, seller, price, condition and commission stay unchanged.", 'existing listing immutability explanation');

mustNot("Barcode is optional.</div>\n        <SmePosItemPhotoField", 'old photo-first manual register flow');

console.log(`Register-existing-stock barcode autofill verification passed (${checks} checks).`);
