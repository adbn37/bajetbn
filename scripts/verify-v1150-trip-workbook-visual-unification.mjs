import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(
    file,
    'utf8',
  ).replace(/\r\n?/g, '\n');

const planning =
  read(
    'src/features/spaces/TripPlanningPanel.tsx',
  );

const budget =
  read(
    'src/features/spaces/TripBudgetSpreadsheet.tsx',
  );

const fund =
  read(
    'src/features/spaces/SpaceFundPanel.tsx',
  );

const settle =
  read(
    'src/features/spaces/SharedExpensesPanel.tsx',
  );

const page =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const css =
  read(
    'src/styles/global.css',
  );

function check(value, label) {
  if (!value) {
    throw new Error(
      'FAIL: ' + label,
    );
  }

  console.log(
    'PASS: ' + label,
  );
}

const tripSources =
  [
    planning,
    budget,
    fund,
    settle,
    page,
  ].join('\n');

check(
  !/[âÃ]/.test(
    tripSources,
  ),
  'Trip workbook source has no mojibake UTF-8 sequences.',
);

for (const value of [
  'Loading Trip worksheet…',
  'Add a stop…',
  'Add a task…',
  'Add booking…',
]) {
  check(
    planning.includes(value),
    `Planning text is correctly encoded: ${value}`,
  );
}

check(
  budget.includes(
    '<span>→</span>',
  )
  && budget.includes(
    'Loading Trip Budget…',
  )
  && budget.includes(
    'placeholder="Add a pot…"'
  ),
  'Budget arrows and ellipses are correctly encoded.',
);

check(
  fund.includes(
    "'—'"
  )
  && settle.includes(
    '—'
  ),
  'Fund and Settle empty-value em dashes are correctly encoded.',
);

check(
  !page.includes(
    'className="trip-workbook-title-v115"'
  )
  && !page.includes(
    'className="trip-workbook-access-v115"'
  )
  && !page.includes(
    'className="trip-workbook-status-v115"'
  ),
  'Redundant workbook chrome no longer consumes worksheet space.',
);

check(
  css.includes(
    'BAJETBN V115 TRIP WORKBOOK VISUAL UNIFICATION'
  ),
  'Workbook visual unification CSS remains installed.',
);

check(
  css.includes(
    '.trip-workbook-sheet-body-v115 {\n  min-height: 0;'
  ),
  'Workbook does not force a tall empty worksheet canvas.',
);

for (const selector of [
  '> .trip-overview-sheet-v115',
  '> .trip-budget-sheet-v115',
  '> .trip-expenses-sheet-v115',
  '> .trip-fund-sheet-v115',
  '> .trip-settle-sheet-v115',
]) {
  check(
    css.includes(selector),
    `Workbook flattening covers ${selector.slice(2)}.`,
  );
}

check(
  css.includes(
    'background: transparent !important;'
  )
  && css.includes(
    'border-radius: 0 !important;'
  )
  && css.includes(
    '.trip-sheet-scroll {\n  border-radius: 3px;'
  ),
  'Workbook sheets retain one flat grid-oriented surface.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 TRIP WORKBOOK VISUAL UNIFICATION: PASS',
);
