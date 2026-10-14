import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const compact = (value) =>
  value.replace(/\s+/g, '');

const page = read(
  'src/features/transactions/TransactionsPage.tsx',
);

const styles =
  read('src/styles/global.css');

const packageJson =
  JSON.parse(
    read('package.json'),
  );

let checks = 0;

function need(
  condition,
  message,
) {
  checks += 1;

  if (!condition) {
    throw new Error(message);
  }
}

for (const token of [
  'useState<string[] | null>',
  'selectedAccountIds',
  'accountMatchesFilter',
  'toggleAccountFilter',
  "selectedAccountIds === null",
  "setSelectedAccountIds(null)",
  "setSelectedAccountIds([])",
  'Select all',
  'Clear',
  'type="checkbox"',
  'transaction-account-filter',
  'transaction-account-scope',
  'accountFilterLabel',
]) {
  need(
    page.includes(token),
    `Money Activity multi-Account UI missing: ${token}`,
  );
}

need(
  page.includes(
    'const personalSummaryRows =',
  )
    && page.includes(
      'visibleTransactions.filter(',
    )
    && page.includes(
      'if (!accountMatchesFilter(item)) return false;',
    ),
  'Money Activity summary must derive from the Account-filtered visible set.',
);

need(
  page.includes(
    'if (!accountMatchesFilter(item)) return false;',
  ),
  'Money Activity list must respect selected Accounts.',
);

need(
  page.includes(
    'personalSummaryRows.forEach((item) => {',
  )
    && page.includes(
      'current.income += item.amountMinor;',
    )
    && page.includes(
      'current.expenses += item.amountMinor;',
    )
    && page.includes(
      'current.transferCount += 1;',
    ),
  'Money Activity summary values must derive from the filtered visible rows.',
);

need(
  /personalSummaryRows\s*\.filter\(\s*\(item\)\s*=>\s*item\.type\s*===\s*'expense'\s*,?\s*\)/
    .test(page),
  'Top categories must derive from the filtered visible set.',
);

need(
  !page.includes(
    'const [accountFilter, setAccountFilter]',
  ),
  'Old single Account filter state must be removed.',
);

need(
  !page.includes(
    '<label>Account<select value={accountFilter}',
  ),
  'Old single Account selector must be removed.',
);

need(
  styles.includes(
    '/* BAJETBN V1.10 MONEY ACTIVITY MULTI ACCOUNT */',
  ),
  'Money Activity multi-Account styles are missing.',
);

need(
  styles.includes(
    '.transaction-account-filter-option input',
  ),
  'Account checkbox styling is missing.',
);

need(
  String(
    packageJson.scripts
      ?.['verify:all-structural']
    || '',
  ).includes(
    'verify-money-activity-multi-account.mjs',
  ),
  'Multi-Account verifier is not registered.',
);

console.log(
  `Money Activity multi-Account checks passed (${checks} checks).`,
);
