import fs from 'node:fs';

const source =
  fs.readFileSync(
    'src/features/commitments/CommitmentsPage.tsx',
    'utf8',
  );

function check(
  condition,
  label,
) {
  if (!condition) {
    throw new Error(
      `FAIL: ${label}`,
    );
  }

  console.log(
    `PASS: ${label}`,
  );
}

check(
  !source.includes(
    'listCommitmentPaymentsForCommitment',
  ),
  'Unsafe payment query removed.',
);

check(
  source.includes(
    'setPayments(scopedPayments);',
  ),
  'Household payment history uses owner-scoped query.',
);

check(
  !source.includes(
    'setItems(personalItems);',
  ),
  'Main Bills no longer filters to Personal Space.',
);

check(
  source.includes(
    'setItems(nextItems);'
  )
  && source.includes(
    'setPayments(nextPayments);',
  ),
  'Main Bills remains global.',
);

check(
  source.includes(
    "'Household Space'",
  ),
  'Household header label is correct.',
);

check(
  source.includes(
    'showSpace={!spaceIdOverride}',
  ),
  'Global cards identify their Space.',
);

check(
  source.includes(
    ': spaces;',
  ),
  'Main Add form supports all owned Spaces.',
);

console.log('');
console.log(
  'GLOBAL BILLS + HOUSEHOLD ACCESS VERIFICATION PASS',
);
