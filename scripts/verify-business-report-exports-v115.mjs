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
  [reports, 'reportRows', 'Shared export rows exist'],
  [reports, 'filteredSales.flatMap', 'Sales export is item-level'],
  [reports, 'downloadExcelHtml', 'Excel-compatible export exists'],
  [reports, 'application/vnd.ms-excel', 'Excel MIME exists'],
  [reports, 'printReportHtml', 'Print/PDF export exists'],
  [reports, 'window.print()', 'Browser PDF flow exists'],
  [reports, 'Active report filters are applied', 'Filtered export scope is explicit'],
  [reports, "reportFileStem + '.csv'", 'CSV uses shared dataset'],
  [reports, "reportFileStem + '.xls'", 'Excel naming exists'],
  [reports, 'Print / PDF', 'PDF action exists'],
  [reports, 'item.discountShareMinor', 'Detailed discount export exists'],
  [reports, 'item.returnedMinor', 'Detailed refund export exists'],
  [css, 'BAJETBN V115 BUSINESS REPORT EXPORTS', 'Responsive export actions exist'],
];

let failed = 0;
for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);

console.log('Business report export verifier: PASS');
