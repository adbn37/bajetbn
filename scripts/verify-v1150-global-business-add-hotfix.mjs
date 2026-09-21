import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\\r\\n?/g, '\\n');

const dashboard = read(
  'src/pages/DashboardPage.tsx',
);
const transactions = read(
  'src/features/transactions/TransactionsPage.tsx',
);
const business = read(
  'src/features/business/BusinessMoneyActivityPage.tsx',
);

function check(value, label) {
  if (!value) {
    throw new Error('FAIL: ' + label);
  }
  console.log('PASS: ' + label);
}

check(
  dashboard.includes(
    'setSpaces(nextActiveSpaces);'
  ),
  'Global Add keeps active Business Spaces loaded.',
);

check(
  dashboard.includes(
    'spaces={quickPersonalSpaces}'
  ),
  'Personal Space picker still excludes Business Spaces.',
);

check(
  dashboard.includes(
    'businessSpaces={quickBusinessSpaces}'
  )
  && dashboard.includes(
    'openAddOnBusiness'
  ),
  'Global Add Business scope is actionable.',
);

check(
  transactions.includes(
    'openAddOnBusiness?: boolean;'
  )
  && transactions.includes(
    "'?quick=1'"
  ),
  'Money scope switch supports Business quick Add links.',
);

check(
  business.includes(
    'const [searchParams, setSearchParams] = useSearchParams();'
  )
  && business.includes(
    "searchParams.get('quick') !== '1'"
  )
  && business.includes(
    'setShowAdd(true);'
  )
  && business.includes(
    "next.delete('quick');"
  ),
  'Business quick Add opens the modal and cleans the URL.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 GLOBAL BUSINESS ADD HOTFIX: PASS',
);
