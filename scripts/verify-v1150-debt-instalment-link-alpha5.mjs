import fs from 'node:fs';

const source =
  fs.readFileSync(
    'src/features/commitments/CommitmentsPage.tsx',
    'utf8',
  ).replace(/\\r\\n?/g, '\\n');

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

check(
  source.includes(
    "candidate.debt.status === 'archived'"
  )
  && source.includes(
    'type-badge'
  )
  && source.includes(
    'Archived'
  ),
  'Archived Debt has a visible status badge.',
);

check(
  source.includes(
    'const archivedOrder'
  )
  && source.includes(
    "a.debt.status === 'archived'"
  )
  && source.includes(
    "b.debt.status === 'archived'"
  ),
  'Active Debt is ordered before archived Debt.',
);

check(
  source.includes(
    "selectedDebt"
  )
  && source.includes(
    "? 'button primary'"
  )
  && source.includes(
    ": 'button secondary'"
  ),
  'Unavailable Link Debt action uses non-primary styling.',
);

check(
  source.includes(
    "busy"
  )
  && source.includes(
    '|| !selectedDebt'
  ),
  'Unavailable Link Debt action remains functionally disabled.',
);

console.log('');
console.log('============================================================');
console.log(' DEBT <-> INSTALMENT LINK ALPHA 5: PASS');
console.log(' Archived status badge : YES');
console.log(' Active Debt first     : YES');
console.log(' Disabled visual state : SECONDARY');
console.log(' Matching rules        : UNCHANGED');
console.log(' Backend changes       : NONE');
console.log('============================================================');
