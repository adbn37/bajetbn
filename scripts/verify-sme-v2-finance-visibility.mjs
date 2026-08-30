import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const command = read('src/features/spaces/SmeOperationsCommandCentre.tsx');
const settings = read('src/features/sme-pos/SmePosSettingsPage.tsx');
const models = read('src/types/models.ts');
const styles = read('src/styles/global.css');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(
  models.includes("classification: AccountClassification;")
    && models.includes("spaceId?: string | null;")
    && models.includes("posEnabled?: boolean;")
    && models.includes("ledgerBalanceMinor: number;"),
  'Slice 2 must reuse the canonical Account model.',
);

expect(
  command.includes("const businessAccounts = accounts")
    && command.includes("item.classification === 'business'")
    && command.includes("item.spaceId === space.id"),
  'SME account ownership must come from Account.spaceId.',
);

expect(
  !command.includes("const accountIds = new Set(")
    && !command.includes("accountsUsed"),
  'Account ownership must not be inferred from transaction activity.',
);

for (const token of [
  'Business accounts',
  'Accounts assigned directly to this Business Space',
  'Cash, bank and other business accounts assigned directly to',
  'POS payments enabled',
  'POS payments off',
  'Open accounts',
  'No business account is assigned to this Business yet.',
  'Assigned to this Business',
]) {
  expect(
    command.includes(token),
    `Missing Business account visibility token: ${token}`,
  );
}

expect(
  command.includes(
    'to={`/spaces/${space.id}?section=accounts`}',
  ),
  'Business Accounts must stay inside the current Business Space.',
);

expect(
  !command.includes('to="/accounts"'),
  'Business Accounts must not escape to the global Accounts page.',
);

expect(
  command.includes(
    'formatMoney(account.ledgerBalanceMinor, account.currency)',
  ),
  'Business owner account cards must use the existing ledger balance.',
);

expect(
  /role\s*===\s*'owner'/.test(command),
  'Owner-specific account management must remain explicit.',
);

expect(
  /item\.spaceId\s*===\s*space\?\.id\s*&&\s*item\.posEnabled\s*===\s*true/.test(settings),
  'Existing POS payment eligibility must remain Space-assigned and POS-enabled.',
);

expect(
  settings.includes('paymentAccountIds'),
  'Legacy POS payment-account compatibility must remain intact.',
);

expect(
  styles.includes('/* SME v2 Slice 2 - business accounts */')
    && styles.includes('.sme-business-account-grid')
    && styles.includes('.sme-business-account-card'),
  'SME Slice 2 styles are missing.',
);

console.log('Business v2 Slice 2 business account visibility checks passed.');