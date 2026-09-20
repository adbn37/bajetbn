import fs from 'node:fs';

const css = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const checks = [
  [css, 'BAJETBN V115 FINAL DESKTOP AUDIT', 'Final desktop audit marker exists'],
  [css, '> .home-v110-secondary-grid {', 'Home secondary cards become full-width row'],
  [css, '> .bajetbn-home-recent-section {', 'Home recent activity becomes full-width'],
  [css, '.home-v110-shortcuts.bajetbn-reference-actions-four {', 'Home quick actions use desktop grid'],
  [css, '.recurring-card-grid {', 'Recurring desktop grid exists'],
  [css, '.business-contact-list {', 'Linked money desktop grid exists'],
  [css, '.collaboration-page {', 'Collaboration desktop width exists'],
  [css, '.collection-detail-layout {', 'Collection detail desktop layout exists'],
  [css, '.collection-organizer-grid {', 'Collection organizer desktop grid exists'],
  [css, '.subscription-payment-layout {', 'Subscription desktop layout exists'],
  [css, '.offline-command-list {', 'Offline Sync desktop grid exists'],
  [css, '.admin-portal-page {', 'Admin desktop width exists'],
  [css, '.admin-bottom-grid {', 'Admin desktop composition exists'],
];

let failed = 0;

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Final desktop audit verifier: PASS',
);
