import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const css = read('src/styles/global.css');

function check(value, label) {
  if (!value) {
    throw new Error('FAIL: ' + label);
  }
  console.log('PASS: ' + label);
}

check(
  css.includes(
    'BAJETBN V115 TRIP HOME DESKTOP WORKSHEET POLISH',
  ),
  'Trip desktop worksheet polish block is installed.',
);

check(
  /\.trip-overview-sheet-v115\.trip-command-centre\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css),
  'Trip Home overrides the legacy two-column command-centre grid.',
);

check(
  /\.trip-overview-sheet-v115\.trip-command-centre\s*>\s*\*\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/.test(css),
  'Every Trip Home worksheet block spans the full desktop row.',
);

check(
  /\.trip-sheet-planning-v115\s+\.trip-planning-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css),
  'Trip Plan visible worksheet uses one full-width desktop column.',
);

check(
  css.includes('.trip-overview-money-table,')
  && css.includes('.trip-overview-team-table')
  && css.includes('table-layout: fixed;'),
  'Trip overview tables fill the available desktop width.',
);

check(
  /@media \(max-width: 900px\)[\s\S]*?\.trip-overview-sheet-v115 \.trip-command-guidance\s*\{[\s\S]*?grid-template-columns:\s*1fr/.test(css),
  'Narrow layouts keep guidance stacked instead of forcing desktop columns.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP HOME DESKTOP POLISH: PASS',
);
