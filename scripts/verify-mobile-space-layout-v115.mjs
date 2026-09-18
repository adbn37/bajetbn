import fs from 'node:fs';

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [
    css,
    'BAJETBN V115 MOBILE SPACE LAYOUT PASS',
    'mobile Space layout marker',
  ],
  [
    css,
    '.space-action-buttons.simplified-space-actions',
    'strong launcher grid selector',
  ],
  [
    css,
    'repeat(2, minmax(0, 1fr)) !important',
    'mobile two-column launcher',
  ],
  [
    css,
    'overflow-x: visible !important',
    'launcher horizontal scrolling removed',
  ],
  [
    css,
    '-webkit-line-clamp: 2',
    'two-line labels supported',
  ],
  [
    css,
    '.space-home-v1147-summary',
    'Space summary density rules',
  ],
  [
    css,
    'padding-bottom: 10.5rem !important',
    'fixed navigation clearance',
  ],
  [
    css,
    '.spaces-card-grid .type-badge',
    'Spaces list badge readability',
  ],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) {
  process.exit(1);
}

console.log(
  'Mobile Space layout verifier: PASS',
);
