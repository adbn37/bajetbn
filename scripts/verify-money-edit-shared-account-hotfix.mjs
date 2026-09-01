import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const accounts =
  read('src/features/accounts/AccountsPage.tsx');
const hub =
  read('src/features/spaces/SpaceActionHub.tsx');
const command =
  read('src/features/spaces/SmeOperationsCommandCentre.tsx');
const txPage =
  read('src/features/transactions/TransactionsPage.tsx');
const txRepo =
  read('src/repositories/transactionRepository.ts');
const models =
  read('src/types/models.ts');
const functions =
  read('functions/src/index.ts');

function must(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(
      'Missing ' + label + ': ' + needle,
    );
  }
}

function reject(text, needle, label) {
  if (text.includes(needle)) {
    throw new Error(
      'Old ' + label + ' still present: ' + needle,
    );
  }
}

must(
  accounts,
  'listAccountsForSpace(',
  'member-safe embedded account loading',
);
must(
  accounts,
  'No Business account shared with you',
  'member Business account empty state',
);
must(
  accounts,
  "account.sharedCanViewBalance === true",
  'shared balance permission',
);
must(
  accounts,
  "account.sharedCanViewLedger === true",
  'shared ledger permission',
);
must(
  accounts,
  "selected.ownerId === user?.uid",
  'owner-only account editing',
);
must(
  hub,
  'canOpenBusinessAccounts',
  'member Business Accounts shortcut',
);
must(
  command,
  'Balance hidden',
  'Business overview hidden balance',
);

must(
  txRepo,
  'updateTransactionDetails',
  'transaction detail update repository',
);
must(
  txPage,
  'Edit money activity details',
  'safe detail edit modal',
);
must(
  txPage,
  'Correct transaction',
  'audited transaction correction',
);
must(
  txPage,
  'transactionHasManagedSource',
  'linked-workflow correction guard',
);
must(
  txPage,
  'initialValues?: TransactionInput',
  'pre-filled correction form',
);
must(
  models,
  'editedAt?: Timestamp | null;',
  'transaction edit audit timestamp',
);
must(
  models,
  'editCount?: number;',
  'transaction edit count',
);
must(
  functions,
  'export const updateTransactionDetails = onCall',
  'server metadata edit callable',
);
must(
  functions,
  'Only the owner of this money activity can edit its details.',
  'server owner-only edit enforcement',
);
must(
  functions,
  'managedKeys',
  'linked-workflow edit protection',
);

reject(
  accounts,
  "targetSpace.type === 'personal'\n            ? await listAllPersonalAccounts(\n                user.uid,\n              )\n            : await listAccountsForOwnerSpace(",
  'single-owner embedded account loader',
);

console.log(
  'MONEY ACTIVITY EDIT + SHARED BUSINESS ACCOUNT VISIBILITY PASS',
);
