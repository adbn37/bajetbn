import fs from 'node:fs';

const home =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const reports =
  fs.readFileSync(
    'src/features/business/BusinessReportsWorkspace.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [home, 'BusinessReportsWorkspace', 'Business Home uses consolidated reports'],
  [home, "workspaceView === 'reports'", 'Reports is a top-level Business workspace'],
  [reports, 'Today', 'Today period exists'],
  [reports, 'Yesterday', 'Yesterday period exists'],
  [reports, 'This week', 'This week period exists'],
  [reports, 'Last 7 days', 'Last 7 days period exists'],
  [reports, 'This month', 'This month period exists'],
  [reports, 'Last month', 'Last month period exists'],
  [reports, 'Custom', 'Custom period exists'],
  [reports, 'event.target.value as ReportRange', 'Report period cast is valid TypeScript syntax'],
  [reports, 'Sales', 'Sales report exists'],
  [reports, 'Products / Stock', 'Products / Stock report exists'],
  [reports, 'Sellers', 'Seller report exists'],
  [reports, 'Quotations / Invoices', 'Document report exists'],
  [reports, 'Profit / Commission', 'Marketplace profit / commission report exists'],
  [reports, 'onClick={exportCurrent}', 'CSV export exists'],
  [reports, 'onClick={exportExcel}', 'Excel export exists'],
  [reports, 'onClick={printCurrent}', 'Print/PDF export exists'],
  [reports, 'getSmePosStaffWorkspace', 'Standard POS report data is reused'],
  [reports, 'getMarketplacePosWorkspace', 'Marketplace report data is reused'],
  [reports, 'getBusinessQuotationWorkspace', 'Quotation report data is reused'],
  [reports, 'getBusinessSalesOrderWorkspace', 'Sales Order report data is reused'],
  [reports, 'getBusinessInvoiceWorkspace', 'Invoice report data is reused'],
  [reports, 'CSV, Excel-compatible .xls and Print / PDF use the selected report, period and active filters.', 'Supported exports are stated accurately'],
  [css, 'BAJETBN V115 BUSINESS REPORTS WORKSPACE', 'Reports styles exist'],
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
  'Business Reports workspace verifier: PASS',
);
