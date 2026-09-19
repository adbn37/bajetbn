import fs from 'node:fs';

const market =
  fs.readFileSync(
    'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
    'utf8',
  );

const posPage =
  fs.readFileSync(
    'src/features/sme-pos/SmePosPage.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [
    market,
    'function exportSellerReportCsv()',
    'period report export exists',
  ],
  [
    market,
    'Export CSV',
    'report export button exists',
  ],
  [
    market,
    'marketplace-report-item-metrics',
    'visual report metrics exist',
  ],
  [
    market,
    'function saleSummaryTitle(',
    'sale summary helper exists',
  ],
  [
    market,
    'marketplace-sale-detail-row',
    'detailed sales rows exist',
  ],
  [
    market,
    'data-print-receipt',
    'print receipt target exists',
  ],
  [
    market,
    'Receipt {receipt.receiptNumber}',
    'receipt number prints inside receipt',
  ],
  [
    market,
    'New Sale',
    'checkout receipt supports new sale',
  ],
  [
    posPage,
    '/business/${space.id}',
    'POS returns to Business Home',
  ],
  [
    css,
    'BAJETBN V115 BUSINESS POS REPORT SALES RECEIPT',
    'new Business POS styles exist',
  ],
  [
    css,
    '@media print',
    'receipt print stylesheet exists',
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

if (failed) process.exit(1);

console.log(
  'Business POS report/sales/receipt verifier: PASS',
);
