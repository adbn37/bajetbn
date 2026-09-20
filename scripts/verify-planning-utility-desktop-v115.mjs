import fs from 'node:fs';

const css = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const checks = [
  [css, 'BAJETBN V115 PLANNING AND UTILITY DESKTOP REFINEMENT', 'Planning/utility desktop marker exists'],
  [css, '.planning-card-grid {', 'Planning cards desktop grid exists'],
  [css, '.debt-list {', 'Debt desktop grid exists'],
  [css, '.calendar-workspace {', 'Calendar desktop workspace exists'],
  [css, '.calendar-filter-panel {', 'Calendar desktop filters exist'],
  [css, '.search-page {', 'Search desktop width exists'],
  [css, '.search-result-row {', 'Search result desktop row exists'],
  [css, '.notification-list {', 'Notifications desktop grid exists'],
  [css, '.my-inbox-list {', 'Inbox desktop grid exists'],
  [css, '.more-v110 {', 'More desktop width exists'],
  [css, '.more-v110-grid {', 'More desktop tools grid exists'],
  [css, '.space-home-v1147 {', 'Space Home desktop composition exists'],
  [css, '.household-command-centre {', 'Household desktop composition exists'],
  [css, '.trip-command-centre {', 'Trip desktop composition exists'],
  [css, '.trip-planning-grid {', 'Trip planning desktop grid exists'],
  [css, '@media (min-width: 1540px)', 'Wide desktop refinement exists'],
];

let failed = 0;

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Planning and utility desktop verifier: PASS',
);
