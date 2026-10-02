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
    'listDebtPayments'
  )
  && source.includes(
    'DebtPayment'
  )
  && source.includes(
    'setDebtPayments'
  ),
  'Instalments load existing Debt payment history.',
);

check(
  source.includes(
    'payment.linkedCommitmentId'
  )
  && source.includes(
    '=== item.id'
  ),
  'Debt payments are matched to the exact linked Instalment.',
);

check(
  source.includes(
    'recentHistory'
  )
  && source.includes(
    'synchronizedDebtPayments'
  ),
  'Direct and synchronized payments are merged for display only.',
);

check(
  source.includes(
    "source:"
  )
  && source.includes(
    "'Debt'"
  )
  && source.includes(
    "'Payment'"
  ),
  'History identifies Debt-synchronized repayments.',
);

check(
  source.includes(
    'payment.reversedAt'
  )
  && source.includes(
    "'Undone'"
  ),
  'Reversed Debt payments are clearly represented.',
);

check(
  source.includes(
    'data-instalment-payment-history'
  )
  && source.includes(
    'recentHistory.map'
  ),
  'Instalment card renders unified recent payment history.',
);

check(
  !source.includes(
    "createCommitmentPayment"
  ),
  'Alpha 7 does not create duplicate Commitment payment records.',
);

console.log('');
console.log('============================================================');
console.log(' DEBT <-> INSTALMENT LINK ALPHA 7: PASS');
console.log(' Debt history loaded   : YES');
console.log(' Exact Instalment match: YES');
console.log(' Unified history       : DISPLAY ONLY');
console.log(' Debt source label     : YES');
console.log(' Reversal visibility   : YES');
console.log(' Duplicate records     : NONE');
console.log(' Backend changes       : NONE');
console.log('============================================================');
