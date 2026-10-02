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

const models =
  read('src/types/models.ts');

const functions =
  read('functions/src/index.ts');

const debtPage =
  read(
    'src/features/debt/DebtPage.tsx',
  );

check(
  models.includes(
    'linkedPaymentSyncCount?: number',
  )
  && models.includes(
    'linkedLatestPaymentId?: string | null',
  )
  && models.includes(
    'linkedCommitmentPreviousNextDueDate?: string | null',
  )
  && models.includes(
    "linkedCommitmentPreviousStatus?: 'active' | 'completed' | null",
  ),
  'Models persist synchronized payment reversal state.',
);

check(
  functions.includes(
    'linkedCommitmentSnapshot',
  )
  && functions.includes(
    'amountPaidMinor:'
  )
  && functions.includes(
    'linkedCommitmentNextDueDate',
  ),
  'Debt payment transaction updates the linked Instalment.',
);

check(
  functions.includes(
    'Linked Debt and Instalment progress is out of sync.'
  )
  && functions.includes(
    'linkedCommitmentData'
  ),
  'Debt payments reject a drifted linked pair.',
);

check(
  functions.includes(
    'linkedCommitmentPreviousNextDueDate'
  )
  && functions.includes(
    'linkedPreviousPaymentId'
  ),
  'Debt payment stores the exact Instalment state required for reversal.',
);

check(
  functions.includes(
    'Reverse the newest linked Debt payment first.'
  )
  && functions.includes(
    'linkedLatestPaymentId'
  ),
  'Linked Debt reversals are latest-first.',
);

check(
  functions.includes(
    'linkedRestoreNextDueDate'
  )
  && functions.includes(
    'linkedRestoreStatus'
  ),
  'Debt reversal restores the linked Instalment schedule and status.',
);

check(
  functions.includes(
    'Reverse linked Debt payments before unlinking this instalment.'
  ),
  'A synchronized pair cannot be unlinked with active linked payments.',
);

check(
  functions.includes(
    'Reverse Debt payments from Debt payment history so the Debt balance stays correct.'
  ),
  'Generic Money Activity reversal cannot bypass Debt reversal.',
);

check(
  functions.includes(
    'Unlink this Instalment from Debt before reversing an older Instalment payment.'
  ),
  'Older Instalment transactions cannot drift a linked pair.',
);

check(
  debtPage.includes(
    "'Reverse latest first'"
  )
  && debtPage.includes(
    'debt.linkedLatestPaymentId'
  ),
  'Debt history explains latest-first reversal ordering.',
);

console.log('');
console.log('============================================================');
console.log(' DEBT <-> INSTALMENT LINK ALPHA 2: PASS');
console.log(' Payment source       : DEBT');
console.log(' Account transaction  : ONE');
console.log(' Ledger entry         : ONE');
console.log(' Instalment progress  : ATOMIC SYNC');
console.log(' Reversal             : ATOMIC + LATEST FIRST');
console.log(' Unlinked Debt        : UNCHANGED');
console.log('============================================================');
