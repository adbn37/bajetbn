import fs from 'node:fs';

const css = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const checks = [
  [css, 'BAJETBN V115 CORE DESKTOP PAGE REFINEMENT', 'Core desktop refinement marker exists'],
  [css, '@media (min-width: 1240px)', 'Core desktop breakpoint exists'],
  [css, '.bajetbn-reference-home {', 'Personal Home desktop composition exists'],
  [css, '> .bajetbn-home-accounts-section', 'Home Accounts desktop placement exists'],
  [css, '> .home-v110-shortcuts', 'Home shortcuts desktop placement exists'],
  [css, '.accounts-page:not(.embedded-module-page)', 'Accounts desktop width exists'],
  [css, '.account-actions {', 'Account desktop action layout exists'],
  [css, '.transaction-toolbar-expanded {', 'Money toolbar desktop layout exists'],
  [css, '.transaction-filter-grid {', 'Money filter desktop layout exists'],
  [css, '.spaces-card-grid.card-grid {', 'Spaces desktop card layout exists'],
  [css, '.incoming-invitation-list {', 'Invitation desktop grid exists'],
  [css, '.health-detail-grid,', 'Report desktop detail grid exists'],
  [css, '.planning-report-grid {', 'Report planning desktop grid exists'],
  [css, '.settings-page {', 'Settings desktop width override exists'],
  [css, '.settings-form {', 'Settings desktop two-column form exists'],
  [css, '.data-tool-grid {', 'Settings data tools desktop grid exists'],
  [css, '@media (min-width: 1540px)', 'Wide desktop refinement exists'],
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
  'Core desktop layout verifier: PASS',
);
