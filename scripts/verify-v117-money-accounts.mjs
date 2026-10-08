import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');

const commitments =
  read('src/features/commitments/CommitmentsPage.tsx');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const accountAvatar =
  read('src/features/accounts/AccountAvatar.tsx');

const globalStyles =
  read('src/styles/global.css');

const transactions =
  read('src/features/transactions/TransactionsPage.tsx');

const accountsPage =
  read('src/features/accounts/AccountsPage.tsx');

const businessMoney =
  read('src/features/business/BusinessMoneyActivityPage.tsx');

const accountsRepository =
  read('src/repositories/accountRepository.ts');

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
    return;
  }

  failures.push(message);
  console.error('FAIL:', message);
}

check(
  /accountSupportsPersonalUse\s*\(\s*account\s*,?\s*\)/m
    .test(commitments),
  'Bills and instalments accept Personal + Business accounts when Personal use is enabled.',
);

check(
  /businessSpaceIdsForAccount\s*\(\s*account\s*,?\s*\)\s*\.includes\s*\(\s*commitment\.spaceId\s*,?\s*\)/m
    .test(commitments)
    && /businessSpaceIdsForAccount\s*\(\s*account\s*,?\s*\)\s*\.includes\s*\(\s*selectedSpace\?\.id\s*\|\|\s*''\s*,?\s*\)/m
      .test(commitments),
  'Business bill and instalment account choices stay linked to the selected Business Space.',
);

check(
  /space\.type\s*!==\s*'personal'\s*&&\s*space\.type\s*!==\s*'sme'\s*&&\s*section\s*===\s*'instalments'/m
    .test(details)
    && /space\.type\s*===\s*'sme'[\s\S]{0,500}?section\s*===\s*'instalments'[\s\S]{0,700}?typeOverride="instalment"/m
      .test(details),
  'Business Instalments use the full Space-scoped module without a duplicate generic list.',
);

check(
  /export function accountSupportsPersonalUse/m
    .test(accountsRepository)
    && /export function businessSpaceIdsForAccount/m
      .test(accountsRepository),
  'Account scope helpers remain centralized in the account repository.',
);

check(
  /listPersonalAccounts\s*\(\s*user\.uid\s*,?\s*\)/m
    .test(transactions)
    && /accountSupportsPersonalUse\s*\(\s*account\s*\)/m
      .test(transactions)
    && /account\.currency\s*===\s*selectedSpace\.currency/m
      .test(transactions)
    && /const destinationOptions\s*=\s*compatibleAccounts\.filter\s*\(\s*\(account\)\s*=>\s*account\.id\s*!==\s*accountId\s*\)/m
      .test(transactions),
  'Personal Move Money keeps same-currency, Personal-use account scoping and prevents self-transfer.',
);

check(
  /listAccountsForSpace\s*\(\s*spaceId\s*\)/m
    .test(businessMoney)
    && /accounts=\{writableAccounts\}/m
      .test(businessMoney)
    && /lockedSpaceId=\{space\.id\}/m
      .test(businessMoney),
  'Business Move Money remains locked to accounts authorized for that Business Space.',
);

check(
  /currency=\{\s*embeddedSpace\?\.currency\s*\|\|\s*profile\.currency\s*\}/m
    .test(accountsPage),
  'Embedded account creation inherits the active Space currency instead of forcing the profile currency.',
);

check(
  /const excludedPersonalMoneySpaceIds\s*=\s*new Set/m
    .test(transactions)
    && /space\.type\s*===\s*'sme'\s*\|\|\s*space\.type\s*===\s*'goal'/m
      .test(transactions)
    && /!excludedPersonalMoneySpaceIds\.has\s*\(\s*item\.spaceId\s*,?\s*\)/m
      .test(transactions),
  'Personal Money excludes Business and legacy Goal/Plan ledger rows even when an account is shared across scopes.',
);

check(
  /account\.currency\s*===\s*targetSpace\.currency/m
    .test(accountsPage)
    && /const currencyMatches\s*=\s*space\.currency\s*===\s*currency/m
      .test(accountsPage)
    && /!linked\s*&&\s*!currencyMatches/m
      .test(accountsPage),
  'Business accounts cannot be newly linked to Business Spaces with a different currency.',
);

check(
  /const totalsByCurrency\s*=\s*useMemo/m
    .test(accountsPage)
    && /totals\.set\s*\(\s*item\.currency/m
      .test(accountsPage)
    && /\.join\(' · '\)/m
      .test(accountsPage)
    && /\{totalMoneyAvailable\}/m
      .test(accountsPage),
  'Accounts summary keeps balances separated by currency instead of combining unlike currencies.',
);

check(
  /const \[classification, setClassification\][\s\S]{0,180}?initial\?\.classification\s*\|\|\s*lockedClassification\s*\|\|\s*'personal'/m
    .test(accountsPage),
  'Editing an existing account from an embedded Space preserves its original Personal or Business classification.',
);

check(
  /const lockedBusinessCreation\s*=\s*!initial\s*&&\s*lockedClassification\s*===\s*'business'/m
    .test(accountsPage)
    && /lockedBusinessCreation[\s\S]{0,280}?spaces[\s\S]{0,220}?space\.currency\s*===\s*currency[\s\S]{0,180}?space\.id/m
      .test(accountsPage)
    && /Boolean\(space\.archivedAt\)\s*\|\|\s*lockedBusinessCreation/m
      .test(accountsPage),
  'New Business accounts created inside a Business Space are automatically and mandatorily linked to that Space.',
);

check(
  /className="space-scoped-account-identity"[\s\S]{0,260}?<AccountAvatar[\s\S]{0,160}?account=\{item\}/m
    .test(details)
    && /institutionDisplay\s*\(\s*item\s*,?\s*\)/m
      .test(details)
    && /institutionDisplay\s*\(\s*account\s*,?\s*\)/m
      .test(details)
    && /BAJETBN V117 SPACE ACCOUNT IDENTITY/m
      .test(globalStyles),
  'Space account lists reuse the shared account icon and institution display.',
);

check(
  /account\.institutionCode\s*&&\s*account\.institutionCode\s*!==\s*'other'/m
    .test(accountAvatar)
    && /value\.includes\('baiduri'\)/m
      .test(accountAvatar)
    && /value\.includes\('bibd'\)/m
      .test(accountAvatar),
  'Legacy accounts with a generic institution code can still recover known Brunei bank branding from institution text.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error('- ' + failure);
  }

  throw new Error(
    'v117 money/accounts verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log('BAJETBN v117 MONEY & ACCOUNTS VERIFICATION PASS');
