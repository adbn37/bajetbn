import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
const need = (text, token, label) => {
  if (!text.includes(token)) throw new Error(`Missing ${label}: ${token}`);
};
const reject = (text, token, label) => {
  if (text.includes(token)) throw new Error(`Unexpected ${label}: ${token}`);
};

const pkg = JSON.parse(read('package.json'));
if (pkg.version !== '1.3.11') throw new Error(`Expected package version 1.3.11, found ${pkg.version}.`);

const workspace = read('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx');
let checks = 0;
const must = (token, label) => { need(workspace, token, label); checks += 1; };
const mustNot = (token, label) => { reject(workspace, token, label); checks += 1; };

// Seller self-service should be one dedicated page, not a repeated banner.
mustNot('marketplace-self-seller-banner', 'repeated seller banner');
must("else if (role === 'seller') tabs = [];", 'seller-only base navigation');
must("if (hasSellerProfile && !tabs.includes('balance')) tabs.push('balance');", 'single seller profile tab');
mustNot("tabs.push('listings')", 'automatic My inventory top-level tab');
mustNot("tabs.push('sales')", 'automatic extra seller-sales top-level tab');
must("if (role === 'seller') return 'balance';", 'seller-only profile landing');
must("setTab('balance');", 'My inventory/profile navigation');
must("Your seller profile", 'profile identity copy');
must("My Seller Profile", 'profile tab label');
must("Your seller items are kept here instead of appearing as a separate cashier page.", 'inventory consolidation explanation');
must("<h3>My inventory</h3>", 'inventory inside seller profile');
must('items={mySellerListings}', 'own inventory source');
must('startLabel="Scan barcode"', 'barcode scanner retained in add stock flow');
must("My sales", 'seller sales retained inside profile');
must("Seller wallet activity", 'wallet history retained');
must("My payouts", 'payout history retained');
must("Available for payout", 'wallet summary retained');
must("+ Add stock", 'add stock action retained');

// Cashier work pages remain cashier work pages.
must("else if (role === 'cashier') tabs = ['register', 'customers', 'bookings', 'sales'];", 'cashier core tabs');
must("? 'My register sales'", 'cashier register-sales label');

// Inventory management remains available to managers/stock staff separately.
must("if (role === 'owner' || role === 'manager') tabs = ['register', 'sellers', 'listings', 'customers', 'bookings', 'sales'];", 'manager inventory tab');
must("else if (role === 'stock_staff') tabs = ['listings'];", 'stock staff inventory tab');
must('<option value="all">All stock</option>', 'manager inventory scope');
must('<option value="mine">My stock · {mySeller.name}</option>', 'manager linked-seller inventory filter');

// v1.3.10 barcode autofill must remain intact.
for (const [token, label] of [
  ["import { BarcodeCameraScanner } from '../../components/BarcodeCameraScanner';", 'shared scanner import'],
  ["function lookupManualListingBarcode(rawBarcode: string, sellerId = manualListingSelectedSellerId)", 'seller-scoped barcode lookup'],
  ["matches.find((item) => item.sellerId === sellerId)", 'same-seller barcode preference'],
  ['Use the phone camera, a USB barcode scanner, or type the code.', 'scanner guidance'],
  ['>Find item</button>', 'manual barcode find action'],
  ["const existingListing = normalizedBarcode", 'save-time duplicate guard'],
  ['await receiveMarketplaceListingStock({', 'existing item receive path'],
  ["manualListingExistingMatch ? 'Quantity to add' : 'Quantity on hand'", 'quantity semantics'],
  ["manualListingExistingMatch ? 'Add stock to existing item'", 'existing-item submit action'],
  ['Saving records a stock receipt and does not create a duplicate listing.', 'duplicate prevention copy'],
  ["await registerExistingMarketplaceListing({", 'new item path'],
]) must(token, label);

console.log(`Seller Profile consolidation + register barcode verification passed (${checks} checks).`);
