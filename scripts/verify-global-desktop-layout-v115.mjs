import fs from 'node:fs';

const css = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const checks = [
  [css, 'BAJETBN V115 GLOBAL DESKTOP LAYOUT FOUNDATION', 'Desktop foundation marker exists'],
  [css, '@media (min-width: 1180px)', 'Primary desktop breakpoint exists'],
  [css, '@media (min-width: 1440px)', 'Wide desktop breakpoint exists'],
  [css, '--desktop-content-max: 1540px', 'Desktop content width token exists'],
  [css, '--desktop-content-wide: 1680px', 'Wide desktop content token exists'],
  [css, '.business-home-v115 {', 'Business Home desktop override exists'],
  [css, '.reports-page {', 'Reports desktop override exists'],
  [css, '.summary-grid {', 'Summary grids use desktop layout'],
  [css, '.dashboard-grid {', 'Dashboard grid uses desktop layout'],
  [css, '.card-grid {', 'Card grid uses desktop layout'],
  [css, '.business-report-filters-v115 {', 'Business report filters use desktop width'],
  [css, '.business-setup-grid-v115 {', 'Business setup uses desktop grid'],
  [css, '.collection-item-grid {', 'Collection desktop grid exists'],
  [css, '.sme-pos-product-grid {', 'POS product desktop grid exists'],
  [css, '.transaction-filter-bar,', 'Money filters desktop grid exists'],
  [css, '.account-grid,', 'Accounts desktop grid exists'],
  [css, 'grid-template-columns:\n      minmax(0, 1.35fr)', 'Wide Business composition exists'],
];

let failed = 0;

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Global desktop layout verifier: PASS',
);
