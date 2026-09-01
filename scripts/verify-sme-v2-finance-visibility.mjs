import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const command = read('src/features/spaces/SmeOperationsCommandCentre.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const hub = read('src/features/spaces/SpaceActionHub.tsx');
const accounts = read('src/features/accounts/AccountsPage.tsx');
const settings = read('src/features/sme-pos/SmePosSettingsPage.tsx');
const models = read('src/types/models.ts');
const accountRepo = read('src/repositories/accountRepository.ts');
const functions = read('functions/src/index.ts');
const styles = read('src/styles/global.css');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(
  models.includes("classification: AccountClassification;")
    && models.includes("businessSpaceIds?: string[];")
    && models.includes("posSpaceIds?: string[];")
    && models.includes("ledgerBalanceMinor: number;"),
  'Canonical Account model must preserve Business multi-Space support.',
);

expect(
  accountRepo.includes('businessSpaceIdsForAccount')
    && accountRepo.includes('posSpaceIdsForAccount')
    && accountRepo.includes('listAccountsForSpace'),
  'Account repository must preserve multi-Space and member-safe shared-account helpers.',
);

expect(
  accounts.includes('sharedSmeSpaces')
    && accounts.includes('Shared with me')
    && accounts.includes('sharedAccountContext')
    && accounts.includes("account.sharedCanViewBalance === true")
    && accounts.includes("account.sharedCanViewLedger === true"),
  'Main Accounts page must render Business accounts shared with the signed-in user.',
);

expect(
  accounts.includes('Accounts shared with you appear on your main Accounts page'),
  'Shared accounts must be presented as a global Accounts feature.',
);

expect(
  hub.includes('{isBusinessOwner && (')
    && !hub.includes('canOpenBusinessAccounts'),
  'SME Business Accounts shortcut must be owner-only.',
);

expect(
  details.includes('const canReadSmeFinancials =\n        canManageSmeFinancials;')
    && details.includes("smePosRole === 'manager'")
    && details.includes("currentMember?.role === 'admin';")
    && !details.includes('listAccountsForSpace('),
  'SME finance must follow role and must not load globally shared account cards.',
);

expect(
  command.includes('Finance role')
    && command.includes("role === 'owner'")
    && !command.includes('account.sharedCanViewBalance')
    && !command.includes('No shared Business account is available to you.'),
  'SME finance/account presentation must be role-scoped and owner-managed.',
);

expect(
  command.includes('formatMoney(account.ledgerBalanceMinor, account.currency)'),
  'Owner Business account cards must use the canonical ledger balance.',
);

expect(
  settings.includes('posSpaceIdsForAccount')
    && settings.includes("posSpaceIdsForAccount(item).includes(space?.id || '')")
    && settings.includes('paymentAccountIds'),
  'POS account compatibility must remain intact.',
);

expect(
  functions.includes('accountLinkedToBusinessSpace')
    && functions.includes('posSpaceIdsForAccountData'),
  'Backend multi-Space Business account enforcement must remain intact.',
);

expect(
  styles.includes('/* SME v2 Slice 2 - business accounts */')
    && styles.includes('.sme-business-account-grid'),
  'SME finance styles must remain available.',
);

console.log('Business v2 role-scoped finance + global shared-account checks passed.');
