import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
const must = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error('Missing ' + label + ': ' + needle);
};
const reject = (text, needle, label) => {
  if (text.includes(needle)) throw new Error('Old ' + label + ' still present: ' + needle);
};

const accountsPage = read('src/features/accounts/AccountsPage.tsx');
const accountRepo = read('src/repositories/accountRepository.ts');
const settingsPage = read('src/features/sme-pos/SmePosSettingsPage.tsx');
const models = read('src/types/models.ts');
const functions = read('functions/src/index.ts');
const rules = read('firestore.rules');

must(models, 'businessSpaceIds?: string[];', 'Business multi-Space account field');
must(models, 'posSpaceIds?: string[];', 'legacy POS compatibility field');
must(models, 'usableSpaceIds?: string[];', 'per-Space account-use access');
must(models, 'balanceSpaceIds?: string[];', 'per-Space balance access');
must(models, 'ledgerSpaceIds?: string[];', 'per-Space ledger access');

must(accountRepo, 'businessSpaceIdsForAccount', 'Business-space migration helper');
must(accountRepo, 'posSpaceIdsForAccount', 'legacy POS compatibility helper');
must(accountRepo, 'listAccountsForSpace', 'member-safe Business account resolver');
must(accountRepo, 'setBusinessAccountMemberAccess', 'Business account sharing mutation');
must(read('src/repositories/transactionRepository.ts'), 'listBusinessTransactionsForSpace', 'member-safe Business transaction listing');

const transactionsPage = read('src/features/transactions/TransactionsPage.tsx');
must(transactionsPage, 'sharedCanViewBalance === false', 'hidden shared-account balance permission check');
must(transactionsPage, "'Balance hidden'", 'hidden shared-account balance wording');
must(transactionsPage, 'canManageCategories', 'shared-member category ownership guard');
must(transactionsPage, 'canAttachFiles', 'shared-member attachment ownership guard');
must(transactionsPage, 'accountAvailableInSelectedSpace', 'Personal/Business account Space isolation UI');

must(accountsPage, 'Available in Business Spaces', 'multi-select Business account UI');
must(accountsPage, 'Share only inside linked Business Spaces', 'member sharing UI');
must(accountsPage, 'Can use account', 'per-member account-use permission');
must(accountsPage, 'Can view balance', 'per-member balance permission');
must(accountsPage, 'Can view activity', 'per-member ledger permission');
must(accountsPage, 'A linked account is automatically available to that Business POS', 'automatic linked-account POS guidance');
reject(accountsPage, 'Allow POS payments in ', 'separate account POS checkbox');
reject(accountsPage, ' · POS in ', 'separate POS account badge');

must(settingsPage, 'businessSpaceIdsForAccount', 'POS Business-space account filtering');
reject(settingsPage, 'posSpaceIdsForAccount', 'separate POS enablement filtering');
must(settingsPage, 'All active Business Accounts linked to this Business are available here.', 'linked account POS guidance');

must(functions, 'getBusinessSpaceAccounts', 'server member Business account listing');
must(functions, 'getBusinessSpaceTransactions', 'server member Business transaction listing');
must(functions, 'setBusinessAccountMemberAccess', 'server member account sharing');
must(functions, 'businessSpaceIdsForAccountData', 'server Business-space resolver');
must(functions, 'if (linkedSpaces.includes(spaceId)) return true;', 'server linked-account POS rule');
must(functions, "This account is not linked to this Business Space.", 'server linked-account error');
must(functions, 'assertAccountForSpaceActor', 'server shared account-use authorization');
must(functions, '!accountLinkedToBusinessSpace(', 'Business invoice multi-Space validation');
must(functions, "ownerId: financialOwnerId", 'shared transaction financial ownership');
reject(functions, 'assignedSpaceId === spaceId && account.posEnabled === true', 'strict single-Space POS isolation');

must(rules, 'canViewAccountLedgerInSpace', 'Space-aware ledger read permission');
must(rules, 'ledgerSpaceIds.hasAny([spaceId])', 'ledger Space allowlist enforcement');
must(rules, "'ledgerSpaceIds' in", 'legacy-safe per-Space ledger permission migration');

console.log('BUSINESS ACCOUNT MULTI-SPACE + AUTOMATIC POS AVAILABILITY VERIFICATION PASS');
