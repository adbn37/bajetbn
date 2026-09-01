import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const command =
  read('src/features/spaces/SmeOperationsCommandCentre.tsx');

const settings =
  read('src/features/sme-pos/SmePosSettingsPage.tsx');

const models =
  read('src/types/models.ts');

const accountRepo =
  read('src/repositories/accountRepository.ts');

const functions =
  read('functions/src/index.ts');

const styles =
  read('src/styles/global.css');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(
  models.includes("classification: AccountClassification;")
    && models.includes("spaceId?: string | null;")
    && models.includes("posEnabled?: boolean;")
    && models.includes("businessSpaceIds?: string[];")
    && models.includes("posSpaceIds?: string[];")
    && models.includes("ledgerBalanceMinor: number;"),
  'Canonical Account model must support legacy and multi-Space Business links.',
);

expect(
  accountRepo.includes('businessSpaceIdsForAccount')
    && accountRepo.includes('posSpaceIdsForAccount'),
  'Business-account repository must expose canonical multi-Space helpers.',
);

expect(
  command.includes("const businessAccounts = accounts")
    && command.includes("item.classification === 'business'")
    && command.includes(
      'businessSpaceIdsForAccount(item).includes(space.id)',
    ),
  'Business Overview must use multi-Space Business-account links.',
);

expect(
  !command.includes(
    "item.spaceId === space.id",
  ),
  'Business Overview must not depend on a single Account.spaceId.',
);

expect(
  !command.includes("const accountIds = new Set(")
    && !command.includes("accountsUsed"),
  'Business-account linkage must not be inferred from transaction activity.',
);

for (const token of [
  'Business accounts',
  'Business accounts linked to this Business Space',
  'One account can also be linked to other Business Spaces.',
  'POS payments enabled here',
  'POS payments off here',
  'Open accounts',
  'No Business account is linked to this Business yet.',
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
  command.includes('account.sharedCanViewBalance === false')
    && command.includes('Balance hidden')
    && command.includes(
      'formatMoney(account.ledgerBalanceMinor, account.currency)',
    ),
  'Business account cards must respect per-account balance visibility while using the canonical ledger balance when allowed.',
);

expect(
  /role\s*===\s*'owner'/.test(command),
  'Owner-specific account management must remain explicit.',
);

expect(
  settings.includes('posSpaceIdsForAccount')
    && settings.includes(
      "posSpaceIdsForAccount(item).includes(space?.id || '')",
    ),
  'POS payment eligibility must be configured independently per Business Space.',
);

expect(
  settings.includes('paymentAccountIds'),
  'Legacy POS payment-account compatibility must remain intact.',
);

expect(
  functions.includes('accountLinkedToBusinessSpace')
    && functions.includes('posSpaceIdsForAccountData'),
  'Backend must enforce multi-Space account linkage and per-Space POS eligibility.',
);

expect(
  styles.includes('/* SME v2 Slice 2 - business accounts */')
    && styles.includes('.sme-business-account-grid')
    && styles.includes('.sme-business-account-card'),
  'SME Slice 2 styles are missing.',
);

console.log(
  'Business v2 Slice 2 multi-Space account visibility checks passed.',
);
