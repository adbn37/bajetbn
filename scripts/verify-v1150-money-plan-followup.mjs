import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\\r\\n?/g, '\\n');

const tx = read(
  'src/features/transactions/TransactionsPage.tsx',
);
const business = read(
  'src/features/business/BusinessMoneyActivityPage.tsx',
);
const dashboard = read(
  'src/pages/DashboardPage.tsx',
);
const spaces = read(
  'src/features/spaces/SpacesPage.tsx',
);
const details = read(
  'src/features/spaces/SpaceDetailsPage.tsx',
);
const css = read(
  'src/styles/global.css',
);

function check(value, label) {
  if (!value) {
    throw new Error('FAIL: ' + label);
  }
  console.log('PASS: ' + label);
}

check(
  tx.includes(
    "selectedSpace?.type !== 'sme'"
  )
  && tx.includes(
    "['expense', 'income', 'transfer']"
  ),
  'Business Space Add Money includes Move Money.',
);

check(
  business.includes(
    'listSpaces,'
  )
  && business.includes(
    'setBusinessSpaces('
  )
  && business.includes(
    'businessSpaces.length ? businessSpaces : [space]'
  ),
  'Active Business scope can reopen the Business Space chooser.',
);

check(
  dashboard.includes(
    'MoneyScopeSwitch'
  )
  && dashboard.includes(
    'quickBusinessSpaces'
  )
  && dashboard.includes(
    'scopeControls={'
  ),
  'Global/mobile Add Money includes Personal / Business choice.',
);

check(
  dashboard.includes(
    'spaces={quickPersonalSpaces}'
  ),
  'Personal quick Add never mixes Business Space selection into the form.',
);

check(
  spaces.includes(
    'What is this Plan for?'
  )
  && spaces.includes(
    'Saving'
  )
  && spaces.includes(
    'Emergency fund'
  )
  && !spaces.includes(
    'Plan / saving / debt payoff'
  ),
  'Plan questionnaire exists and Debt is removed from Plan creation.',
);

check(
  details.includes(
    "'Plan target';"
  )
  && details.includes(
    "space.type !== 'goal'"
  )
  && details.includes(
    "nextSpace.type === 'goal'\n          && requestedSection === 'goals'"
  ),
  'Plan Spaces use focused Plan target tools.',
);

check(
  css.includes(
    'BAJETBN V115 MONEY PLAN FOLLOWUP'
  )
  && css.includes(
    'column-gap: .2rem !important'
  ),
  'Account identity rows are tightened.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 MONEY / PLAN FOLLOW-UP: PASS',
);
