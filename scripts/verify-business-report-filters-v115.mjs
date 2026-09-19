import fs from 'node:fs';

const reports = fs.readFileSync(
  'src/features/business/BusinessReportsWorkspace.tsx',
  'utf8',
);
const quotations = fs.readFileSync(
  'src/features/business/BusinessQuotationsPage.tsx',
  'utf8',
);
const orders = fs.readFileSync(
  'src/features/business/BusinessSalesOrdersPage.tsx',
  'utf8',
);
const invoices = fs.readFileSync(
  'src/features/business/BusinessInvoicesPage.tsx',
  'utf8',
);
const css = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const checks = [
  [reports, 'All sellers', 'Seller filter exists'],
  [reports, 'All categories', 'Category filter exists'],
  [reports, 'All items', 'Item filter exists'],
  [reports, 'All payment methods', 'Payment filter exists'],
  [reports, 'All accounts', 'Account filter exists'],
  [reports, 'All statuses', 'Document status filter exists'],
  [reports, 'Clear filters', 'Clear filters control exists'],
  [reports, 'catalogByItemId', 'Sale category filtering uses catalog data'],
  [reports, '/pos?tab=sales', 'Sales drill down to POS Sales'],
  [reports, 'quotationId=', 'Quotation exact deep link exists'],
  [reports, 'salesOrderId=', 'Sales Order exact deep link exists'],
  [reports, 'invoiceId=', 'Invoice exact deep link exists'],
  [quotations, "searchParams.get('quotationId')", 'Quotation page accepts deep link'],
  [orders, "searchParams.get('salesOrderId')", 'Sales Order page accepts deep link'],
  [invoices, "searchParams.get('invoiceId')", 'Invoice page accepts deep link'],
  [invoices, 'listBusinessInvoicePayments', 'Invoice deep link loads payment history'],
  [css, 'BAJETBN V115 BUSINESS REPORT FILTERS', 'Filter styles exist'],
];

let failed = 0;

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Business report filters and drilldown verifier: PASS',
);
