import fs from 'node:fs';

const reports = fs.readFileSync(
  'src/features/business/BusinessReportsWorkspace.tsx',
  'utf8',
);

const css = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const checks = [
  [reports, 'SmePosItemPhoto', 'Saved photos are supported'],
  [reports, 'catalogDetailByItemId', 'Catalog photo lookup exists'],
  [reports, 'business-sale-detail-v115', 'Sales are compact and expandable'],
  [reports, 'Payment split', 'Split payments are shown'],
  [reports, 'sale.subtotalMinor', 'Subtotal is shown'],
  [reports, 'sale.discountMinor', 'Discount is shown'],
  [reports, 'sale.returnedMinor', 'Refunds are shown'],
  [reports, 'sale.voidedMinor', 'Voids are shown'],
  [reports, 'sale.costMinor', 'Cost is shown'],
  [reports, 'sale.profitMinor', 'Profit is shown'],
  [reports, 'sale.marketplaceCommissionMinor', 'Commission is shown'],
  [reports, 'sale.sellerEarningsMinor', 'Seller earnings are shown'],
  [reports, 'item.sku', 'SKU is shown when available'],
  [reports, 'item.barcode', 'Barcode is shown when available'],
  [reports, 'item.sellerName', 'Seller is shown when available'],
  [reports, 'Open in POS', 'POS drilldown remains'],
  [css, 'BAJETBN V115 DETAILED SALES REPORT', 'Compact styles exist'],
];

let failed = 0;

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Detailed Business Sales report verifier: PASS',
);
