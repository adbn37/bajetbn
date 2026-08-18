import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
};
const reject = (text, needle, label) => {
  if (text.includes(needle)) throw new Error(`Old ${label} still present: ${needle}`);
};

const accountsPage = read('src/features/accounts/AccountsPage.tsx');
const accountRepo = read('src/repositories/accountRepository.ts');
const settingsPage = read('src/features/sme-pos/SmePosSettingsPage.tsx');
const posRepo = read('src/repositories/smePosRepository.ts');
const models = read('src/types/models.ts');
const functions = read('functions/src/index.ts');

must(models, 'spaceId?: string | null;', 'Account SME ownership field');
must(models, 'posEnabled?: boolean;', 'Account POS eligibility field');

must(accountRepo, 'spaceId?: string | null;', 'create/update account SME ownership payload');
must(accountRepo, 'posEnabled?: boolean;', 'create/update account POS payload');

must(accountsPage, 'Business account ownership', 'Accounts ownership guidance');
must(accountsPage, 'Business / SME Space', 'business owner selector');
must(accountsPage, "Use for this business's POS payments", 'POS eligibility toggle');
must(accountsPage, 'item.type === \'sme\' && item.ownerId === user?.uid', 'owner-only SME choices');
must(accountsPage, 'Unassigned business accounts', 'legacy migration view');
must(accountsPage, 'Managers and cashiers cannot change this.', 'manager/cashier restriction copy');

must(settingsPage, 'Payment accounts', 'read-only POS payment account section');
must(settingsPage, 'managed from Accounts', 'Accounts source-of-truth copy');
must(settingsPage, 'Managers and cashiers cannot attach another account here.', 'POS restriction copy');
must(settingsPage, 'Manage business accounts →', 'Accounts management link');
reject(settingsPage, 'Accounts available at this POS', 'POS account checklist');
reject(settingsPage, 'togglePaymentAccount', 'POS account toggle handler');

reject(posRepo, 'paymentAccountIds?: string[];', 'client POS account allowlist mutation');

must(functions, 'requireOwnedSmeSpaceForAccount', 'server owner-only account assignment');
must(functions, "Only the SME Space owner can assign a business account to that Space.", 'server SME owner enforcement');
must(functions, 'spaceId, posEnabled,', 'account ownership persistence');
must(functions, 'isSmePosPaymentAccountForSpace', 'SME/POS account ownership resolver');
must(functions, "assignedSpaceId === spaceId && account.posEnabled === true", 'strict assigned-account isolation');
must(functions, 'Boolean(legacyIds?.includes(accountId))', 'legacy v1.3.2 fallback');
must(functions, 'paymentAccountIds: currentData.paymentAccountIds ?? null', 'legacy allowlist preservation only');
reject(functions, 'const hasPaymentAccountIds = Array.isArray(request.data?.paymentAccountIds);', 'POS settings allowlist mutation');
must(functions, 'This account does not belong to this SME POS.', 'server cross-SME rejection');

const enforcementCount =
  (functions.match(/requireSmePosPaymentAccountForSpace\(context\.settings, accountSnapshot\.data\(\) \|\| \{\}, paymentAccountId, spaceId\);/g) || []).length;

if (enforcementCount !== 3) {
  throw new Error(`Expected strict account ownership enforcement at Standard checkout, Marketplace checkout, and seller payout; found ${enforcementCount}.`);
}

console.log('SME account ownership + POS isolation verifier: PASS');
