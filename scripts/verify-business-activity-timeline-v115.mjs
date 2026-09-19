import fs from 'node:fs';

const home =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const timeline =
  fs.readFileSync(
    'src/features/business/BusinessActivityTimeline.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [home, 'BusinessActivityTimeline', 'Business Home uses rich timeline'],
  [home, 'Sales, documents, bookings, payouts and money movements in one timeline.', 'Timeline purpose is visible'],
  [timeline, 'getBusinessQuotationWorkspace', 'Quotations participate in activity'],
  [timeline, 'getBusinessSalesOrderWorkspace', 'Sales Orders participate in activity'],
  [timeline, 'getBusinessInvoiceWorkspace', 'Invoices participate in activity'],
  [timeline, 'getSmePosStaffWorkspace', 'Standard POS sales participate in activity'],
  [timeline, 'getMarketplacePosWorkspace', 'Marketplace sales and payouts participate in activity'],
  [timeline, 'listSmePosReservations', 'Bookings participate in activity'],
  [timeline, 'POS refund', 'Refund activity is represented'],
  [timeline, 'Invoice payment', 'Invoice payments are identified'],
  [timeline, 'businessInvoicePaymentId', 'Invoice payment source traceability is used'],
  [timeline, 'saleTransactionIds', 'POS financial duplicates are suppressed'],
  [timeline, 'payoutTransactionIds', 'Payout financial duplicates are suppressed'],
  [timeline, '.slice(', 'Home timeline is intentionally bounded'],
  [css, 'BAJETBN V115 BUSINESS ACTIVITY TIMELINE', 'Timeline styles exist'],
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

if (home.includes('recentRows.map')) {
  console.log(
    'FAIL old generic transaction-only timeline remains',
  );
  failed += 1;
} else {
  console.log(
    'PASS old generic transaction-only timeline removed',
  );
}

if (failed) process.exit(1);

console.log(
  'Business Activity timeline verifier: PASS',
);
