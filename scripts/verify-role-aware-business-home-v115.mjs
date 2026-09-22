import fs from 'node:fs';

const page =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [
    page,
    'getBusinessProfile',
    'Business industry is loaded',
  ],
  [
    page,
    "nextRole === 'manager'",
    'Manager financial access is explicit',
  ],
  [
    page,
    'if (!canReadFinancials)',
    'Restricted roles skip financial loading',
  ],
  [
    page,
    "posRole === 'cashier'",
    'Cashier role has dedicated workspace',
  ],
  [
    page,
    "posRole === 'stock_staff'",
    'Stock Staff role has dedicated workspace',
  ],
  [
    page,
    "posRole === 'seller'",
    'Seller role has dedicated workspace',
  ],
  [
    page,
    "posRole === 'viewer'",
    'View Only role has dedicated workspace',
  ],
  [
    page,
    'businessActions',
    'Business shortcuts are capability-driven',
  ],
  [
    page,
    'canViewFinancials && (',
    'Financial sections are role-gated',
  ],
  [
    page,
    'All-time Business total',
    'Owner / Manager financial hero preserved',
  ],
  [
    page,
    'businessTransactionTotal',
    'Owner / Manager all-time total calculation remains',
  ],
  [
    page,
    'moneyIn',
    'Owner / Manager monthly money-in calculation remains',
  ],
  [
    page,
    'moneyOut',
    'Owner / Manager monthly money-out calculation remains',
  ],
  [
    page,
    'monthNet',
    'Owner / Manager monthly net calculation remains',
  ],
  [
    css,
    'BAJETBN V115 ROLE AWARE BUSINESS HOME',
    'Role-aware Business Home styles',
  ],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

  console.log(
    (ok ? 'PASS ' : 'FAIL ')
    + label,
  );

  if (!ok) {
    failed += 1;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  'Role-aware Business Home verifier: PASS',
);
