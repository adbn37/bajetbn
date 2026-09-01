import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n');
const accounts = read('src/features/accounts/AccountsPage.tsx');
const hub = read('src/features/spaces/SpaceActionHub.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const command = read('src/features/spaces/SmeOperationsCommandCentre.tsx');
const txPage = read('src/features/transactions/TransactionsPage.tsx');
const txRepo = read('src/repositories/transactionRepository.ts');
const models = read('src/types/models.ts');
const functions = read('functions/src/index.ts');

const must = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error('Missing ' + label + ': ' + needle);
};
const reject = (text, needle, label) => {
  if (text.includes(needle)) throw new Error('Old ' + label + ' remains: ' + needle);
};

must(accounts, 'sharedSmeSpaces', 'global shared SME discovery');
must(accounts, 'sharedAccountContext', 'shared account context');
must(accounts, 'Shared with me', 'global shared account section');
must(accounts, 'listAccountsForSpace(', 'member-safe shared account loading');
must(accounts, "account.sharedCanViewBalance === true", 'shared balance permission');
must(accounts, "account.sharedCanViewLedger === true", 'shared ledger permission');
must(accounts, "selected.ownerId === user?.uid", 'owner-only account edit');
must(accounts, 'Accounts shared with you appear on your main Accounts page', 'global sharing explanation');
reject(accounts, 'No Business account shared with you', 'embedded shared-account UI');

must(hub, '{isBusinessOwner && (', 'owner-only Business Accounts shortcut');
reject(hub, 'canOpenBusinessAccounts', 'member Business Accounts shortcut');

must(details, 'const canReadSmeFinancials =\n        canManageSmeFinancials;', 'role-only SME financial loading');
must(details, "currentMember?.role === 'admin';", 'admin role finance access');
reject(details, 'listAccountsForSpace(', 'shared account loading inside SME details');

must(command, 'Finance role', 'role-driven SME finance');
must(command, "{role === 'owner' && (\n          <section className=\"sme-business-accounts\">", 'owner-only SME account details');
reject(command, 'account.sharedCanViewBalance', 'shared balance logic inside SME');
reject(command, 'No shared Business account is available to you.', 'shared-account messaging inside SME');

must(txRepo, 'updateTransactionDetails', 'transaction detail repository');
must(txPage, 'Edit money activity details', 'detail edit');
must(txPage, 'Correct transaction', 'transaction correction');
must(txPage, 'transactionHasManagedSource', 'managed-source protection');
must(txPage, 'initialValues?: TransactionInput', 'prefilled correction');
must(models, 'editedAt?: Timestamp | null;', 'edit audit timestamp');
must(models, 'editCount?: number;', 'edit audit count');
must(functions, 'export const updateTransactionDetails = onCall', 'server edit callable');

console.log('GLOBAL SHARED ACCOUNTS + ROLE-SCOPED SME + MONEY EDIT PASS');
