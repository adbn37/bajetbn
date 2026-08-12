function versionAtLeastForReleaseGate(
  current,
  minimum,
) {
  const currentParts = String(current)
    .split('-')[0]
    .split('.')
    .map(Number);

  const minimumParts = String(minimum)
    .split('-')[0]
    .split('.')
    .map(Number);

  for (let index = 0; index < 3; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;

    if (currentPart > minimumPart) return true;
    if (currentPart < minimumPart) return false;
  }

  return true;
}

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };
const includes = (file, tokens) => {
  if (!exists(file)) fail(`Missing ${file}`);
  const source = read(file);
  for (const token of tokens) if (!source.includes(token)) fail(`${file} is missing: ${token}`);
};

const release = JSON.parse(read('release.json'));
if (!versionAtLeastForReleaseGate(release.version, '0.11.8')) fail('Brunei money options require v0.11.8 or later.');
includes('src/config/bruneiMoneyOptions.ts', [
  "code: 'bibd'", "code: 'baiduri'", "code: 'taib'", "code: 'standard_chartered_brunei'",
  "code: 'bank_transfer'", "code: 'cash'", "code: 'debit_card'", "code: 'credit_card'",
  "code: 'e_wallet'", "code: 'qr_payment'", "code: 'bank_deposit'", "code: 'cheque'", "code: 'other'",
  'institutionCodeForLabel', 'suggestedPaymentMethod', 'paymentMethodLabel',
]);
includes('src/components/PaymentMethodField.tsx', ['PaymentMethodField', 'Type the payment method', 'PAYMENT_METHODS.map']);
includes('src/features/accounts/AccountsPage.tsx', ['brunei-institution-options', 'Choose a common Brunei option or type another institution', 'institutionCodeForLabel']);
for (const file of [
  'src/features/transactions/TransactionsPage.tsx',
  'src/features/recurring/RecurringTransactionsPage.tsx',
  'src/features/collaboration/CollaborationPage.tsx',
  'src/features/spaces/SharedExpensesPanel.tsx',
  'src/features/spaces/SpaceFundPanel.tsx',
  'src/features/commitments/CommitmentsPage.tsx',
]) includes(file, ['PaymentMethodField']);
includes('src/types/models.ts', ['export type InstitutionCode', 'export type PaymentMethodCode', 'institutionCode?: InstitutionCode', 'paymentMethod?: PaymentMethodCode']);
includes('functions/src/index.ts', ['const institutionCodes', 'const paymentMethodCodes', 'paymentMethodValues', 'institutionCode', 'paymentMethodLabel']);
includes('BRUNEI_BANKS_PAYMENT_METHODS_ALPHA.md', ['Existing Accounts', 'Older records display `Not recorded`', 'Staging checks']);

const audit = JSON.parse(read('scope/pre-v1-scope.json'));
for (const id of ['brunei.institutions', 'brunei.payment_methods']) {
  const item = audit.items.find((entry) => entry.id === id);
  if (!item || !['manual_test', 'complete'].includes(item.status)) {
    fail(`${id} must be manual_test or complete after implementation.`);
  }
}
console.log('Brunei institution and payment-method checks passed (presets, custom options, compatibility and workflow coverage).');
