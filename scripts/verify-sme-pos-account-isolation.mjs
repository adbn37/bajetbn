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
must(models, 'posSpaceIds?: string[];', 'per-Business POS account field');
must(models, 'usableSpaceIds?: string[];', 'per-Space account-use access');
must(models, 'balanceSpaceIds?: string[];', 'per-Space balance access');
must(models, 'ledgerSpaceIds?: string[];', 'per-Space ledger access');

must(accountRepo, 'businessSpaceIdsForAccount', 'Business-space migration helper');
must(accountRepo, 'posSpaceIdsForAccount', 'per-Business POS helper');
must(accountRepo, 'listAccountsForSpace', 'member-safe Business account resolver');
must(accountRepo, 'setBusinessAccountMemberAccess', 'Business account sharing mutation');
must(read('src/repositories/transactionRepository.ts'), 'listBusinessTransactionsForSpace', 'member-safe Business transaction listing');
must(read('src/features/transactions/TransactionsPage.tsx'), "sharedCanViewBalance === false ? 'Balance hidden'", 'hidden shared-account balance UI');
must(read('src/features/transactions/TransactionsPage.tsx'), 'canManageCategories', 'shared-member category ownership guard');
must(read('src/features/transactions/TransactionsPage.tsx'), 'canAttachFiles', 'shared-member attachment ownership guard');
must(read('src/features/transactions/TransactionsPage.tsx'), 'accountAvailableInSelectedSpace', 'Personal/Business account Space isolation UI');

must(accountsPage, 'Business accounts are managed inside their Business Space.', 'Personal-First Business account guidance');
must(accountsPage, 'Available in Business Spaces', 'multi-select Business account UI');
must(accountsPage, 'Share only inside linked Business Spaces', 'member sharing UI');
must(accountsPage, 'Can use account', 'per-member account-use permission');
must(accountsPage, 'Can view balance', 'per-member balance permission');
must(accountsPage, 'Can view activity', 'per-member ledger permission');
must(read('src/features/spaces/SpaceActionHub.tsx'), "listAccountsForSpace(space.id)", 'shared Business account money loader');
must(read('src/features/spaces/SpaceActionHub.tsx'), 'Add Income', 'shared Business income action');
must(read('src/features/spaces/SpaceActionHub.tsx'), 'Add Expense', 'shared Business expense action');
reject(accountsPage, 'Other Business Spaces cannot use it.', 'single-Business ownership copy');
reject(accountsPage, 'Assign each business account to one Business Space here.', 'single-Business guidance');

must(settingsPage, 'businessSpaceIdsForAccount', 'POS multi-Space account filtering');
must(settingsPage, 'posSpaceIdsForAccount', 'POS per-Business enablement');

must(functions, 'getBusinessSpaceAccounts', 'server member Business account listing');
must(functions, 'getBusinessSpaceTransactions', 'server member Business transaction listing');
must(functions, 'setBusinessAccountMemberAccess', 'server member account sharing');
must(functions, 'businessSpaceIdsForAccountData', 'server Business-space resolver');
must(functions, 'accountPosEnabledForBusinessSpace', 'server per-Business POS resolver');
must(functions, 'assertAccountForSpaceActor', 'server shared account-use authorization');
must(functions, '!accountLinkedToBusinessSpace(', 'Business invoice multi-Space validation');
must(functions, "ownerId: financialOwnerId", 'shared transaction financial ownership');
reject(functions, 'assignedSpaceId === spaceId && account.posEnabled === true', 'strict single-Space POS isolation');

must(rules, 'canViewAccountLedgerInSpace', 'Space-aware ledger read permission');
must(rules, 'ledgerSpaceIds.hasAny([spaceId])', 'ledger Space allowlist enforcement');
must(rules, "'ledgerSpaceIds' in", 'legacy-safe per-Space ledger permission migration');

console.log('BUSINESS ACCOUNT MULTI-SPACE + MEMBER SHARING VERIFICATION PASS');
