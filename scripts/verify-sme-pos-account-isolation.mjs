import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
};

const settings = read('src/features/sme-pos/SmePosSettingsPage.tsx');
const repo = read('src/repositories/smePosRepository.ts');
const models = read('src/types/models.ts');
const functions = read('functions/src/index.ts');

must(models, 'paymentAccountIds?: string[];', 'POS account allowlist model');

must(repo, 'paymentAccountIds?: string[];', 'POS setup repository allowlist');

must(settings, 'Accounts available at this POS', 'owner account selector');
must(settings, 'Accounts for your other businesses will stay hidden from this checkout.', 'business isolation explanation');
must(settings, 'paymentAccountIds,', 'saved account allowlist');
must(settings, 'selectedBusinessAccounts.map', 'default account limited to selected accounts');
must(settings, "setError(`Choose at least one business account for ${space?.name || 'this POS'}.`);", 'at least one account guard');
must(settings, 'nextPaymentAccountIds', 'legacy account migration');
must(settings, "item.classification === 'business' && item.currency === nextSpace.currency", 'legacy active business-account selection');

must(functions, 'configuredSmePosPaymentAccountIds', 'server allowlist reader');
must(functions, 'requireConfiguredSmePosPaymentAccount', 'server allowlist enforcement');
must(functions, 'paymentAccountIds: paymentAccountIds ?? currentData.paymentAccountIds ?? null', 'server allowlist persistence');
must(functions, '&& (!allowedIds || allowedIds.includes(item.id));', 'checkout-account filtering');
must(functions, 'This account is not available at this SME POS. Update POS Settings first.', 'cross-SME checkout rejection');

const enforcementCount =
  (functions.match(/requireConfiguredSmePosPaymentAccount\(context\.settings, paymentAccountId\);/g) || []).length;

if (enforcementCount !== 3) {
  throw new Error(
    `Expected 3 server enforcement points (Standard checkout, Marketplace checkout, seller payout); found ${enforcementCount}.`
  );
}

console.log('SME POS account isolation verifier: PASS');
