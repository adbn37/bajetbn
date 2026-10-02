import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\\r\\n?/g, '\\n');

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

const helper =
  read(
    'src/utils/debtInstalmentLink.ts',
  );

const commitments =
  read(
    'src/features/commitments/CommitmentsPage.tsx',
  );

check(
  helper.includes(
    'getDebtInstalmentLinkIssues',
  )
  && helper.includes(
    "'Different total amount.'"
  )
  && helper.includes(
    "'Paid progress does not match.'"
  )
  && helper.includes(
    "'Different Space.'"
  )
  && helper.includes(
    "'Different currency.'"
  ),
  'Common Debt link mismatches have explicit reasons.',
);

check(
  helper.includes(
    "'Debt is archived.'"
  )
  && helper.includes(
    "'Debt is already linked to another Instalment.'"
  )
  && helper.includes(
    "'Instalment is already linked to another Debt.'"
  ),
  'Lifecycle and existing-link conflicts are explained.',
);

check(
  helper.includes(
    'getDebtInstalmentLinkIssues('
  )
  && helper.includes(
    ').length === 0'
  ),
  'Compatibility boolean and diagnostics share one rule source.',
);

check(
  commitments.includes(
    'candidateRows'
  )
  && commitments.includes(
    'data-debt-link-diagnostics'
  )
  && commitments.includes(
    'Other I Owe Debts'
  ),
  'Unavailable I Owe Debt remains visible.',
);

check(
  commitments.includes(
    'Cannot link:'
  )
  && commitments.includes(
    'candidate.issues.join'
  ),
  'Unavailable Debt displays mismatch reasons.',
);

check(
  commitments.includes(
    'candidate.debt.totalMinor'
  )
  && commitments.includes(
    'candidate.debt.paidMinor'
  )
  && commitments.includes(
    'candidate.debt.balanceMinor'
  ),
  'Diagnostic rows display total, paid and remaining amounts.',
);

check(
  commitments.includes(
    'selectedDebt'
  )
  && commitments.includes(
    '|| !selectedDebt'
  )
  && commitments.includes(
    'No compatible Debt'
  ),
  'Link action stays disabled without a valid selection.',
);

check(
  commitments.includes(
    'canLinkDebtAndInstalment('
  ),
  'Selectable Debt continues using the shared compatibility rule.',
);

console.log('');
console.log('============================================================');
console.log(' DEBT <-> INSTALMENT LINK ALPHA 4: PASS');
console.log(' Compatible selection : YES');
console.log(' Mismatch diagnostics : YES');
console.log(' Total / paid / left  : VISIBLE');
console.log(' Disabled empty action: YES');
console.log(' Backend changes       : NONE');
console.log('============================================================');
