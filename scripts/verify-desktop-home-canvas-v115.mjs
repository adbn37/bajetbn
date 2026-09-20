import fs from 'node:fs';

const css = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const marker =
  'BAJETBN V115 DESKTOP HOME CANVAS CORRECTION';

const markerIndex =
  css.indexOf(marker);

if (markerIndex < 0) {
  console.error(
    'FAIL Desktop Home correction marker exists',
  );
  process.exit(1);
}

const desktop =
  css.slice(markerIndex);

const checks = [
  [
    /@media\s*\(min-width:\s*1240px\)/.test(desktop),
    'Desktop-only correction starts at 1240px',
  ],
  [
    /\.page\.bajetbn-reference-home\s*\{[\s\S]*?max-width:\s*none;/.test(desktop),
    'Home removes global page max-width cap',
  ],
  [
    /\.page\.bajetbn-reference-home\s*\{[\s\S]*?repeat\(\s*12,\s*minmax\(0,\s*1fr\)/.test(desktop),
    'Home uses 12-column desktop grid',
  ],
  [
    /\.bajetbn-home-account-card\s*\{[\s\S]*?min-width:\s*0\s*!important;[\s\S]*?max-width:\s*none\s*!important;/.test(desktop),
    'Desktop account cards override mobile peek width',
  ],
  [
    /\.home-v110-shortcuts\.bajetbn-reference-actions-four\s*\{[\s\S]*?repeat\(\s*2,[\s\S]*?\)\s*!important;/.test(desktop),
    'Quick actions use 2-by-2 desktop grid',
  ],
  [
    /\.home-v110-activity-row\s*\{[\s\S]*?38px[\s\S]*?minmax\(220px,\s*1fr\)[\s\S]*?minmax\(132px,\s*auto\)/.test(desktop),
    'Recent Activity uses icon, copy and value columns',
  ],
  [
    />\s*\.bajetbn-home-recent-section\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*span\s*8;/.test(desktop),
    'Recent Activity occupies main desktop column',
  ],
  [
    />\s*\.home-v110-secondary-grid\s*\{[\s\S]*?grid-column:\s*9\s*\/\s*-1;/.test(desktop),
    'Budget, Goals and Plan occupy side rail',
  ],
];

let failed = 0;

for (const [ok, label] of checks) {
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!ok) {
    failed += 1;
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(
  'Desktop Home canvas verifier: PASS',
);
