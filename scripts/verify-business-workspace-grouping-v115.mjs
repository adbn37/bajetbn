import fs from 'node:fs';

const home =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const market =
  fs.readFileSync(
    'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [
    home,
    'data-business-workspace-nav',
    'Business workspace navigation exists',
  ],
  [
    home,
    'Products & Stock',
    'Inventory group exists',
  ],
  [
    home,
    'Sellers',
    'Seller group exists',
  ],
  [
    home,
    'Reports',
    'Report group exists',
  ],
  [
    home,
    'data-business-workspace-embedded',
    'Marketplace tools embed in Business Home',
  ],
  [
    home,
    'hideManagementTabs',
    'Embedded Marketplace hides duplicate navigation',
  ],
  [
    home,
    "label: 'Open POS'",
    'POS remains a dedicated workspace',
  ],
  [
    market,
    'hideManagementTabs?: boolean;',
    'Marketplace supports embedded navigation suppression',
  ],
  [
    market,
    '!hideManagementTabs',
    'Marketplace duplicate tabs are conditionally hidden',
  ],
  [
    css,
    'BAJETBN V115 BUSINESS WORKSPACE GROUPING',
    'Business workspace styles exist',
  ],
];

let failed = 0;

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log(
    (ok ? 'PASS ' : 'FAIL ')
      + label,
  );
  if (!ok) failed += 1;
}

if (
  home.includes(
    "?section=marketplace-listings",
  )
) {
  console.log(
    'FAIL old Marketplace Listings route remains on Business Home',
  );
  failed += 1;
} else {
  console.log(
    'PASS old Marketplace Listings route removed from Business Home',
  );
}

if (
  home.includes(
    "?section=marketplace-sellers",
  )
) {
  console.log(
    'FAIL old Marketplace Sellers route remains on Business Home',
  );
  failed += 1;
} else {
  console.log(
    'PASS old Marketplace Sellers route removed from Business Home',
  );
}

if (failed) process.exit(1);

console.log(
  'Business workspace grouping verifier: PASS',
);
