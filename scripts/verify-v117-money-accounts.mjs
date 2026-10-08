import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');

const commitments =
  read('src/features/commitments/CommitmentsPage.tsx');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const transactions =
  read('src/features/transactions/TransactionsPage.tsx');

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
