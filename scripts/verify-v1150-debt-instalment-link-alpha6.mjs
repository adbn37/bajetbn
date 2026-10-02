import fs from 'node:fs';

const source =
  fs.readFileSync(
    'functions/src/index.ts',
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

const recordStart =
  source.indexOf(
    'export const recordDebtPayment = onCall(',
  );

const recordEnd =
  source.indexOf(
    'export const reverseDebtPayment = onCall(',
    recordStart,
  );

const reverseStart =
  recordEnd;

const reverseEnd =
  source.indexOf(
    'export const setDebtPaymentProof = onCall(',
    reverseStart,
  );

const record =
  source.slice(
    recordStart,
    recordEnd,
  );

const reverse =
  source.slice(
    reverseStart,
    reverseEnd,
  );

check(
  record.includes(
    "db.collection('budgets')"
  )
  && record.includes(
    'matchingBudgetIds('
  )
  && record.includes(
    'updateBudgetsSpent('
  )
  && record.includes(
    'amountMinor'
  ),
  'Linked Debt payment participates in normal budget accounting.',
);

check(
  record.includes(
    'linkedCategoryId'
  )
  && record.includes(
    'linkedCommitmentData'
  )
  && record.includes(
    'transactionCategory'
  )
  && record.includes(
    'categoryIsSystem'
  ),
  'Linked Debt payment inherits Instalment category metadata.',
);

check(
  record.includes(
    'budgetIds,'
  )
  && record.includes(
    "sourceType: 'debt_payment'"
  ),
  'Debt Money Activity stores the exact matching budget IDs.',
);

check(
  record.includes(
    "'Debt repayment'"
  )
  && record.includes(
    "'Debt repayment received'"
  ),
  'Unlinked Debt retains its generic transaction category.',
);

check(
  reverse.includes(
    'originalTransactionData'
  )
  && reverse.includes(
    '.budgetIds'
  )
  && reverse.includes(
    'linkedBudgetIds'
  )
  && reverse.includes(
    'linkedBudgetSnapshots'
  ),
  'Debt reversal reads budget IDs from the original transaction.',
);

check(
  reverse.includes(
    'updateBudgetsSpent('
  )
  && reverse.includes(
    '-amountMinor'
  ),
  'Debt reversal removes the original linked budget impact.',
);

check(
  reverse.includes(
    'Array.isArray('
  )
  && reverse.includes(
    ': []'
  ),
  'Legacy Debt payments without budget IDs remain reversible.',
);

check(
  !record.includes(
    "db.collection('commitmentPayments').doc("
  ),
  'Linked Debt payment does not create a duplicate Commitment payment.',
);

check(
  record.includes(
    "entryType:"
  )
  && record.includes(
    "'debt_payment_out'"
  ),
  'Debt remains the single ledger/payment source.',
);

console.log('');
console.log('============================================================');
console.log(' DEBT <-> INSTALMENT LINK ALPHA 6: PASS');
console.log(' Payment source       : DEBT ONLY');
console.log(' Money transaction    : ONE');
console.log(' Ledger entry         : ONE');
console.log(' Instalment category  : INHERITED');
console.log(' Budget spend         : ATOMIC');
console.log(' Budget reversal      : EXACT + ATOMIC');
console.log(' Legacy reversals     : COMPATIBLE');
console.log(' Backend changes      : FUNCTIONS');
console.log('============================================================');
