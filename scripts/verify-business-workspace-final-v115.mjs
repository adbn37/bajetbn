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

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const navStart =
  home.indexOf(
    'data-business-workspace-nav',
  );

const navEnd =
  home.indexOf(
    '</nav>',
    navStart,
  );

const nav =
  home.slice(
    navStart,
    navEnd,
  );

const ordered = [
  'Home',
  'POS',
  'Products & Stock',
  'Sales & Documents',
  'Sellers',
  'Finance',
  'Reports',
  'Business Setup',
];

let previous = -1;
let failed = 0;

for (const label of ordered) {
  const index = nav.indexOf(label);

  if (label === 'Sellers' && index < 0) {
    console.log('FAIL Sellers exists in Business nav source');
    failed += 1;
    continue;
  }

  if (index < 0) {
    console.log('FAIL ' + label + ' exists in Business nav');
    failed += 1;
    continue;
  }

  if (index <= previous) {
    console.log('FAIL ' + label + ' follows agreed Business module order');
    failed += 1;
  } else {
    console.log('PASS ' + label + ' follows agreed Business module order');
  }

  previous = index;
}

const checks = [
  [home, 'canAccessInventoryWorkspace', 'Inventory role gate exists'],
  [home, 'canAccessSellersWorkspace', 'Seller management role gate exists'],
  [home, 'canUseEmbeddedStandard', 'Standard POS embedding exists'],
  [home, 'data-business-standard-inventory', 'Standard inventory is embedded in Business'],
  [home, 'embeddedManagementTab="products"', 'Standard Products tab is reused'],
  [css, '.sme-pos-workspace-tabs', 'Nested POS tabs are hidden by embedded shell CSS'],
  [standard, "embeddedManagementTab?: 'products' | null", 'Standard POS supports embedded Products'],
  [standard, "embeddedManagementTab = null", 'Standard POS embedded mode is explicit'],
  [standard, 'embeddedManagementTab', 'Embedded tab drives Standard POS'],
  [css, 'BAJETBN V115 FINAL BUSINESS WORKSPACE SHELL', 'Final shell styles exist'],
];

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Final Business workspace shell verifier: PASS',
);
