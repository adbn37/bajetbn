import fs from 'node:fs';

const home =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const standard =
  fs.readFileSync(
    'src/features/sme-pos/StandardPosWorkspace.tsx',
    'utf8',
  );

const marketplace =
  fs.readFileSync(
    'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
    'utf8',
  );

const checks = [
  [home, "label: 'Open Register'", 'Cashier Register shortcut'],
  [home, "label: 'Customers'", 'Cashier Customers shortcut'],
  [home, "label: 'Bookings'", 'Cashier Bookings shortcut'],
  [home, "label: 'My Sales'", 'Cashier Sales shortcut'],
  [home, "posRole === 'stock_staff'", 'Stock Staff branch'],
  [home, "label: 'My Balance'", 'Seller Balance shortcut'],
  [home, "label: 'My Reports'", 'Seller Reports shortcut'],
  [home, "posRole === 'viewer'", 'Viewer branch'],
  [standard, 'useSearchParams', 'Standard POS deep-link support'],
  [standard, "searchParams.get('tab')", 'Standard requested tab'],
  [standard, 'availableTabs.includes(', 'Standard role validation'],
  [marketplace, "searchParams.get('tab')", 'Marketplace deep-link support'],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log('Business role shortcut verifier: PASS');
