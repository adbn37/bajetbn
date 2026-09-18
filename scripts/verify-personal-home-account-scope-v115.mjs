import fs from 'node:fs';

const dashboard =
  fs.readFileSync(
    'src/pages/DashboardPage.tsx',
    'utf8',
  );

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log('PASS:', label);
  } else {
    console.error('FAIL:', label);
    failures.push(label);
  }
}

check(
  /const\s+homeAccounts\s*=[\s\S]{0,700}?classification[\s\S]{0,80}?===\s*'personal'/m.test(
    dashboard,
  ),
  'Personal Home carousel is filtered to Personal accounts.',
);

check(
  /const\s+quickAccounts\s*=[\s\S]{0,500}?classification[\s\S]{0,80}?===\s*'personal'/m.test(
    dashboard,
  ),
  'Global Add remains Personal-account only.',
);

check(
  dashboard.includes(
    'Personal only · Business excluded',
  ),
  'Total Assets remains explicitly Personal-only.',
);

check(
  !dashboard.includes(
    "a.classification === 'business'",
  ),
  'Old Personal+Business Home sorting logic is removed.',
);

if (failures.length) {
  throw new Error(
    'Personal Home account scope verification failed: '
    + failures.length
    + ' check(s).',
  );
}

console.log(
  'Personal Home account scope verifier: PASS',
);
