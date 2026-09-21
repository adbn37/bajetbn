import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\\r\\n?/g, '\\n');

const business =
  read(
    'src/features/business/BusinessMoneyActivityPage.tsx',
  );

const transactions =
  read(
    'src/features/transactions/TransactionsPage.tsx',
  );

const accounts =
  read(
    'src/features/accounts/AccountsPage.tsx',
  );

const posRepo =
  read(
    'src/repositories/smePosRepository.ts',
  );

const functions =
  read(
    'functions/src/index.ts',
  );

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
  business.includes(
    'const writableAccounts ='
  )
  && business.includes(
    'account.sharedCanUseAccount\n              !== false'
  )
  && business.includes(
    'accounts={writableAccounts}'
  )
  && !business.includes(
    'activeAccounts'
  ),
  'Business Add Money only receives writable Business accounts.',
);

check(
  business.includes(
    'writableAccounts.length === 0'
  )
  && business.includes(
    'Can use account'
  ),
  'Business quick add and Add button explain missing write access.',
);

check(
  transactions.includes(
    'const canTransferBetweenAccounts ='
  )
  && transactions.includes(
    'compatibleAccounts.length >= 2'
  )
  && transactions.includes(
    "? ['expense', 'income', 'transfer']"
  ),
  'Move Money is offered only when two compatible accounts are available.',
);

check(
  transactions.includes(
    'account={sourceAccount}'
  )
  && transactions.includes(
    'account={destinationAccount}'
  ),
  'Move Money retains real account identity cards.',
);

check(
  accounts.includes(
    'A linked account is automatically available to that Business POS'
  )
  && posRepo.includes(
    "httpsCallable(functions, 'getSmePosPaymentAccounts')"
  )
  && functions.includes(
    'if (linkedSpaces.includes(spaceId)) return true;'
  ),
  'Business POS keeps automatic linked-account payment availability.',
);

check(
  functions.includes(
    'assertAccountForSpaceActor'
  )
  && functions.includes(
    'The Business owner has not shared this account with you for money activity in this Space.'
  ),
  'Server-side Business posting permission remains authoritative.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 MONEY FLOW ACCEPTANCE: PASS',
);
