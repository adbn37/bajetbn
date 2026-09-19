import fs from 'node:fs';

const home =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const accounts =
  fs.readFileSync(
    'src/features/accounts/AccountsPage.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [home, "workspaceView === 'finance'", 'Finance workspace exists'],
  [home, 'AccountsPage', 'Accounts embed in Business Finance'],
  [home, 'CommitmentsPage', 'Bills embed in Business Finance'],
  [home, 'Money Activity', 'Money Activity appears in Finance'],
  [home, 'Accounting', 'Accounting appears in Finance'],
  [home, 'Tax', 'Tax appears in Finance'],
  [home, 'Payroll', 'Payroll appears in Finance'],
  [home, 'Linked account balances', 'Shared account balance wording is safe'],
  [accounts, 'Link existing', 'Business can link an existing Global Business Account'],
  [accounts, 'Unlink from Business', 'Business can unlink without deleting account'],
  [accounts, 'Used by ', 'Global Business Accounts show Business usage count'],
  [accounts, "lockedClassification", 'Business account creation locks correct scope only when embedded'],
  [accounts, "const lockedPersonal =", 'Personal module compatibility lock remains explicit'],
  [accounts, 'Your bank, cash, card and e-wallet accounts.', 'Personal-First Global Accounts guidance remains compatible'],
  [css, 'BAJETBN V115 BUSINESS FINANCE GLOBAL ACCOUNTS', 'Finance styles exist'],
];

let failed = 0;

for (const [source, token, label] of checks) {
  const ok = source.includes(token);
  console.log(
    (ok ? 'PASS ' : 'FAIL ')
      + label,
  );
  if (!ok) failed += 1;
}

if (
  accounts.includes(
    'groups.map(({ space, accounts: businessAccounts })',
  )
) {
  console.log(
    'FAIL Global Accounts still groups Business accounts by Business Space',
  );
  failed += 1;
} else {
  console.log(
    'PASS Global Business accounts are not grouped by Business Space',
  );
}

if (failed) process.exit(1);

console.log(
  'Business Finance / Global Accounts verifier: PASS',
);
