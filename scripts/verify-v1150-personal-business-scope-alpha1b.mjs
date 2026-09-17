import assert from 'node:assert/strict';
import fs from 'node:fs';

const reports =
  fs.readFileSync(
    'src/features/reports/ReportsPage.tsx',
    'utf8',
  ).replace(
    /\r\n?/g,
    '\n',
  );

const transactions =
  fs.readFileSync(
    'src/features/transactions/TransactionsPage.tsx',
    'utf8',
  ).replace(
    /\r\n?/g,
    '\n',
  );

const spaces =
  fs.readFileSync(
    'src/features/spaces/SpaceDetailsPage.tsx',
    'utf8',
  ).replace(
    /\r\n?/g,
    '\n',
  );

const contract =
  fs.readFileSync(
    'FINANCE_SCOPE_SEPARATION_ALPHA1B.md',
    'utf8',
  ).replace(
    /\r\n?/g,
    '\n',
  );

for (
  const marker
  of [
    'listTransactionsForOwnerAccount(',
    "item.type === 'personal'",
    'Business money stays inside its Business Space.',
  ]
) {
  assert.equal(
    reports.includes(
      marker,
    ),
    true,
    `Global Reports personal-only marker missing: ${marker}`,
  );
}

for (
  const forbidden
  of [
    'listBusinessReportTransactionsForSpace(',
    'listAccountsForSpace(',
    'reportableBundles',
    'businessBundles',
  ]
) {
  assert.equal(
    reports.includes(
      forbidden,
    ),
    false,
    `Global Reports still loads Business data: ${forbidden}`,
  );
}

for (
  const marker
  of [
    'listPersonalAccounts(',
    'listTransactionsForOwnerAccount(',
    "space.type === 'personal'",
    'setWritableAccounts(',
    'if (!cancelled) void load();',
    'View your Personal money activity. Business money stays inside its Business Space.',
    'Personal money only.',
    'Business activity is kept inside its specific Business Space.',
  ]
) {
  assert.equal(
    transactions.includes(
      marker,
    ),
    true,
    `Global Money Activity personal-only marker missing: ${marker}`,
  );
}

for (
  const forbidden
  of [
    'listBusinessTransactionsForSpace(',
    'listAccountsForSpace(',
    'listAllAccounts(',
    'listFinancialApprovalRequests(',
    'spaceFilter',
    'setSpaceFilter',
    'Personal and Business money together.',
    'View Personal and Business money activity in one place',
  ]
) {
  assert.equal(
    transactions.includes(
      forbidden,
    ),
    false,
    `Global Money Activity still loads Business data: ${forbidden}`,
  );
}

for (
  const marker
  of [
    'listBusinessTransactionsForSpace(',
    'listTransactionsForOwnerSpace(',
    "if (space.type === 'sme') return 'Keep business money separate from personal money.';",
    '?section=money',
    "'reports'",
  ]
) {
  assert.equal(
    spaces.includes(
      marker,
    ),
    true,
    `Business Space scoped-money marker missing: ${marker}`,
  );
}

for (
  const marker
  of [
    'Global Money Activity shows Personal money only.',
    'Global Money Reports show Personal money only.',
    'Business A data must not appear in Business B.',
    'a Business-side money-out record',
    'a Personal-side money-in record',
    'does not yet add the linked cross-scope transfer UI/backend',
  ]
) {
  assert.equal(
    contract.includes(
      marker,
    ),
    true,
    `Scope contract missing: ${marker}`,
  );
}

console.log(
  'BajetBN v1.15.0 Personal / Business Money Scope Alpha 1B verification PASS.',
);
