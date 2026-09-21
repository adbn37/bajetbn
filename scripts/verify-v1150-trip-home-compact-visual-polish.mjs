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
    'BAJETBN V115 TRIP HOME COMPACT VISUAL POLISH'
  ),
  'Trip Home compact visual polish block is installed.',
);

check(
  css.includes(
    '.trip-overview-sheet-v115 {\n    gap: .58rem;'
  ),
  'Trip Home desktop spacing is tightened.',
);

check(
  css.includes(
    '.trip-overview-money-table th:nth-child(6)'
  )
  && css.includes(
    'width: 12%;'
  ),
  'Money overview uses a narrower action column.',
);

check(
  css.includes(
    '.trip-overview-team-table th:nth-child(3)'
  )
  && css.includes(
    'width: 40%;'
  ),
  'Trip team gives more room to attention text.',
);

check(
  css.includes(
    '.trip-command-guidance .notice'
  )
  && css.includes(
    'padding: .62rem .72rem;'
  ),
  'Empty-state guidance is compact on desktop.',
);

check(
  css.includes(
    '.trip-overview-budget-source-note'
  )
  && css.includes(
    'font-size: .76rem;'
  ),
  'Budget source note is visually de-emphasized.',
);

check(
  css.includes(
    '.trip-sheet-new-row'
  )
  && css.includes(
    'min-height: 48px;'
  ),
  'Trip Plan entry row is clearer and easier to edit.',
);

check(
  css.includes(
    '@media (max-width: 900px)'
  )
  && css.includes(
    '.trip-overview-budget-source-note {\n    display: grid;'
  ),
  'Narrow layouts keep the budget note readable.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP HOME COMPACT VISUAL POLISH: PASS',
);
