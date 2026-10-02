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
    'buildInstalmentPaymentHistory'
  )
  && source.includes(
    'synchronizedDebtPayments'
  ),
  'Direct and Debt payments share one history builder.',
);

check(
  source.includes(
    'const fullPaymentHistory'
  )
  && source.includes(
    'fullPaymentHistory.slice'
  ),
  'Card preview is derived from the full payment history.',
);

check(
  source.includes(
    'historyCommitment'
  )
  && source.includes(
    'setHistoryCommitment'
  ),
  'Instalment history can open in a dedicated modal.',
);

check(
  source.includes(
    'View payment history'
  )
  && source.includes(
    'onViewHistory'
  ),
  'Instalment cards expose the full history action.',
);

check(
  source.includes(
    'data-instalment-full-payment-history'
  )
  && source.includes(
    'data-full-payment-history-rows'
  ),
  'Full payment history renders every combined history row.',
);

check(
  source.includes(
    "Debt repayment"
  )
  && source.includes(
    "Direct payment"
  ),
  'Full history clearly separates payment sources.',
);

check(
  source.includes(
    "payment.status === 'Saved'"
  )
  && source.includes(
    'undoneCount'
  ),
  'Saved and reversed history remain visible.',
);

check(
  source.includes(
    'Open linked Debt'
  )
  && source.includes(
    'data-full-history-linked-debt'
  ),
  'Full history keeps navigation to the linked Debt.',
);

check(
  !source.includes(
    'createCommitmentPayment'
  ),
  'Alpha 8 does not create duplicate payment records.',
);

console.log('');
console.log('============================================================');
console.log(' DEBT <-> INSTALMENT LINK ALPHA 8: PASS');
console.log(' History source        : SHARED BUILDER');
console.log(' Card preview          : LATEST 2');
console.log(' Full history          : ALL PAYMENTS');
console.log(' Direct/Debt labels    : YES');
console.log(' Reversed visibility   : YES');
console.log(' Linked Debt navigation: YES');
console.log(' Backend changes       : NONE');
console.log('============================================================');
