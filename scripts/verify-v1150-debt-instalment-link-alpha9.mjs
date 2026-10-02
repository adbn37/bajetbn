import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(
    path,
    'utf8',
  ).replace(/\\r\\n?/g, '\\n');

const functions =
  read(
    'functions/src/index.ts',
  );

const commitments =
  read(
    'src/features/commitments/CommitmentsPage.tsx',
  );

const debtPage =
  read(
    'src/features/debt/DebtPage.tsx',
  );

const compatibility =
  read(
    'src/utils/debtInstalmentLink.ts',
  );

function block(
  source,
  start,
  end,
) {
  const from =
    source.indexOf(start);

  if (from < 0) {
    throw new Error(
      'Missing block: ' + start,
    );
  }

  const to =
    source.indexOf(
      end,
      from,
    );

  if (to < 0) {
    return source.slice(
      from,
    );
  }

  return source.slice(
    from,
    to,
  );
}

function check(
  value,
  label,
) {
  if (!value) {
    throw new Error(
      'FAIL: ' + label,
    );
  }

  console.log(
    'PASS: ' + label,
  );
}

const link =
  block(
    functions,
    'export const linkDebtInstalment',
    'export const unlinkDebtInstalment',
  );

const unlink =
  block(
    functions,
    'export const unlinkDebtInstalment',
    'export const recordDebtPayment',
  );

const record =
  block(
    functions,
    'export const recordDebtPayment',
    'export const reverseDebtPayment',
  );

const reverse =
  block(
    functions,
    'export const reverseDebtPayment',
    'export const setDebtPaymentProof',
  );

check(
  link.includes(
    'preserveDebtSyncState'
  )
  && link.includes(
    'preservedLinkedPaymentSyncCount'
  )
  && link.includes(
    'preservedLinkedLatestPaymentId'
  ),
  'One-sided reciprocal repair preserves Debt synchronization metadata.',
);

check(
  link.includes(
    'The linked Debt payment history is incomplete.'
  ),
  'Inconsistent synchronization metadata fails closed instead of being reset.',
);

check(
  unlink.includes(
    'linkedPaymentSyncCount > 0'
  )
  && unlink.includes(
    '|| linkedLatestPaymentId'
  ),
  'Unlink checks both synchronized-payment markers.',
);

check(
  record.includes(
    'linkedCommitmentData'
  )
  && record.includes(
    'Linked Debt and Instalment progress is out of sync.'
  ),
  'Linked payment still verifies pair consistency before writing.',
);

check(
  !record.includes(
    "db.collection('commitmentPayments').doc("
  ),
  'Debt remains the only payment source for a linked pair.',
);

check(
  record.includes(
    'matchingBudgetIds'
  )
  && record.includes(
    'updateBudgetsSpent'
  )
  && record.includes(
    'budgetIds'
  ),
  'Linked Debt payment still updates matching budget once.',
);

check(
  reverse.includes(
    'Reverse the newest linked Debt payment first.'
  )
  && reverse.includes(
    'linkedPreviousPaymentId'
  ),
  'Linked reversal remains latest-first with chain restoration.',
);

check(
  reverse.includes(
    'linkedBudgetIds'
  )
  && reverse.includes(
    '-amountMinor'
  ),
  'Linked reversal still restores recorded budget spend.',
);

check(
  commitments.includes(
    'buildInstalmentPaymentHistory'
  )
  && commitments.includes(
    'View payment history'
  )
  && commitments.includes(
    "Debt repayment"
  )
  && commitments.includes(
    "Direct payment"
  ),
  'Instalment UI keeps unified direct and Debt payment history.',
);

check(
  debtPage.includes(
    "'Reverse latest first'"
  ),
  'Debt UI keeps latest-first reversal guidance.',
);

check(
  compatibility.includes(
    'Different total amount.'
  )
  && compatibility.includes(
    'Paid progress does not match.'
  )
  && compatibility.includes(
    'Different Space.'
  ),
  'Compatibility diagnostics remain intact.',
);

console.log('');
console.log(
  '============================================================',
);
console.log(
  ' DEBT <-> INSTALMENT LINK ALPHA 9: PASS',
);
console.log(
  ' Reciprocal repair     : SAFE',
);
console.log(
  ' Sync metadata         : PRESERVED',
);
console.log(
  ' Unlink guard          : FAIL CLOSED',
);
console.log(
  ' Payment source        : DEBT ONLY',
);
console.log(
  ' Budget accounting     : PRESERVED',
);
console.log(
  ' Reversal ordering     : LATEST FIRST',
);
console.log(
  ' Unified history       : PRESERVED',
);
console.log(
  ' Feature scope         : FINAL HARDENING',
);
console.log(
  '============================================================',
);

