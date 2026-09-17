import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(
    file,
    'utf8',
  ).replace(
    /\r\n?/g,
    '\n',
  );
}

const functions =
  read(
    'functions/src/index.ts',
  );

const models =
  read(
    'src/types/models.ts',
  );

const linkedRepo =
  read(
    'src/repositories/linkedMoneyRepository.ts',
  );

const linkedPage =
  read(
    'src/features/linked-money/LinkedMoneyPage.tsx',
  );

const payrollRepo =
  read(
    'src/repositories/businessPayrollRepository.ts',
  );

const payrollPage =
  read(
    'src/features/business/BusinessPayrollPage.tsx',
  );

const posRepo =
  read(
    'src/repositories/smePosRepository.ts',
  );

const transactionRepo =
  read(
    'src/repositories/transactionRepository.ts',
  );

const app =
  read(
    'src/app/App.tsx',
  );

const moneyPage =
  read(
    'src/features/transactions/TransactionsPage.tsx',
  );

const contract =
  read(
    'LINKED_RECIPIENT_MONEY_ALPHA1C.md',
  );

for (
  const marker
  of [
    'export const ensureLinkedMoneyOffer = onCall(',
    'export const getLinkedMoneyOffers = onCall(',
    'export const respondLinkedMoneyOffer = onCall(',
    "db.collection(\n        'linkedMoneyOffers'",
    "entryType:\n                'linked_money_in'",
    "status:\n              'external'",
    "status:\n              'accepted'",
    "status:\n                'declined'",
    "targetPath:\n              '/linked-money'",
    "accountSnapshot.data()\n            ?.classification\n            !== 'personal'",
  ]
) {
  assert.equal(
    functions.includes(
      marker,
    ),
    true,
    `Linked Money backend marker missing: ${marker}`,
  );
}

for (
  const marker
  of [
    "export type LinkedMoneyKind =",
    "export interface LinkedMoneyOffer",
    "linkedMoneyOfferId?: string | null;",
    "linkedMoneyStatus?: 'pending' | 'accepted' | 'declined' | 'external' | 'unavailable' | null;",
  ]
) {
  assert.equal(
    models.includes(
      marker,
    ),
    true,
    `Linked Money type marker missing: ${marker}`,
  );
}

for (
  const marker
  of [
    'ensureLinkedMoneyOffer(',
    'listLinkedMoneyOffers()',
    'respondLinkedMoneyOffer(',
  ]
) {
  assert.equal(
    linkedRepo.includes(
      marker,
    ),
    true,
    `Linked Money client repository marker missing: ${marker}`,
  );
}

for (
  const marker
  of [
    'Payments sent to you',
    'Joining or linking is optional.',
    'Add to Personal Money',
    "Don't add",
    'listPersonalAccounts(',
  ]
) {
  assert.equal(
    linkedPage.includes(
      marker,
    ),
    true,
    `Linked Money recipient page marker missing: ${marker}`,
  );
}

assert.equal(
  payrollRepo.includes(
    "ensureLinkedMoneyOffer(\n        'business_payroll_run'",
  ),
  true,
  'Payroll must request the optional recipient link after posting.',
);

assert.equal(
  payrollRepo.includes(
    "categoryId:\n          'expense-wages'",
  ),
  true,
  'Payroll must post the canonical Staff wages category.',
);

assert.equal(
  payrollPage.includes(
    'The linked BajetBN recipient will be able to add the salary to Personal Money.',
  ),
  true,
  'Payroll UX must explain linked salary delivery.',
);

assert.equal(
  posRepo.includes(
    "ensureLinkedMoneyOffer(\n        'marketplace_payout'",
  ),
  true,
  'Direct Marketplace payouts must request recipient linking.',
);

assert.equal(
  transactionRepo.includes(
    "ensureLinkedMoneyOffer(\n        'marketplace_payout'",
  ),
  true,
  'Approved Marketplace payouts must request recipient linking.',
);

assert.equal(
  app.includes(
    '<Route path="linked-money" element={<LinkedMoneyPage />} />',
  ),
  true,
  'Linked Money recipient route is missing.',
);

assert.equal(
  moneyPage.includes(
    'to="/linked-money">Linked money</Link>',
  ),
  true,
  'Personal Money must expose Linked Money inbox.',
);

for (
  const marker
  of [
    'Signup is never required.',
    'The Business does not see the recipient',
    'Declining the link does not reverse or modify the Business payment.',
    'One offer can create at most one Personal income transaction.',
    'Owner Draw, reimbursement, capital contribution and generic Business-to-Personal transfers remain for a later slice',
  ]
) {
  assert.equal(
    contract.includes(
      marker,
    ),
    true,
    `Alpha 1C contract marker missing: ${marker}`,
  );
}

console.log(
  'BajetBN v1.15.0 Linked Recipient Money Alpha 1C verification PASS.',
);
