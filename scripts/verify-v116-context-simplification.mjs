import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\\r\\n?/g, '\\n');

const transactions = read('src/features/transactions/TransactionsPage.tsx');
const businessMoney = read('src/features/business/BusinessMoneyActivityPage.tsx');
const dashboard = read('src/pages/DashboardPage.tsx');
const more = read('src/pages/MorePage.tsx');
const goals = read('src/features/goals/GoalsPage.tsx');
const hub = read('src/features/spaces/SpaceActionHub.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');

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
  !transactions.includes('scopeControls?: ReactNode')
    && !transactions.includes('scopeControls={<MoneyScopeSwitch')
    && !transactions.includes('money-entry-scope-controls'),
  'Money Activity modal no longer contains a duplicate Personal/Business scope switch.',
);

check(
  transactions.includes('<MoneyScopeSwitch mode="personal" businessSpaces={businessSpaces} />'),
  'Personal/Business switching remains available at the Personal Money page level.',
);

check(
  businessMoney.includes('<MoneyScopeSwitch mode="business"')
    && !businessMoney.includes('scopeControls={<MoneyScopeSwitch'),
  'Business switching remains page-level while Business add stays locked to its Business.',
);

check(
  !dashboard.includes('MoneyScopeSwitch')
    && !dashboard.includes('quickBusinessSpaces'),
  'Home quick add no longer repeats Personal/Business scope controls.',
);

check(
  transactions.includes('<span>Recorded in</span>')
    && transactions.includes("? 'Personal money'")
    && transactions.includes('contextual-space-change'),
  'Unlocked Money Activity shows one low-friction Recorded in context.',
);

check(
  transactions.includes("space.type !== 'sme'")
    && transactions.includes("space.type !== 'goal'")
    && dashboard.includes("item.type !== 'sme'")
    && dashboard.includes("item.type !== 'goal'"),
  'Everyday Personal Money context excludes Business and Goal/Plan Spaces.',
);

check(
  hub.includes('lockedSpaceId={space.id}')
    && details.includes('lockedSpaceId={space.id}')
    && businessMoney.includes('lockedSpaceId={space.id}'),
  'Specific Space and Business add flows keep automatic locked context.',
);

check(
  more.includes("{ to: '/goals', label: 'Goals, plans & debt' }")
    && !more.includes("{ to: '/debt', label: 'Debt' }")
    && more.includes("space.type !== 'goal'"),
  'More routes planning discovery through Goals and keeps Plan Spaces out of the general launcher.',
);

check(
  goals.includes('data-goals-plan-hub-v116')
    && goals.includes("item.type === 'goal'")
    && goals.includes('to="/debt"')
    && goals.includes('<SpaceAvatar space={plan} />'),
  'Goals surfaces Plan Spaces and Debt planning together.',
);

check(
  !dashboard.includes('<strong>Goals</strong>')
    && dashboard.includes('<strong>Trips</strong>')
    && dashboard.includes('<strong>Receipt</strong>')
    && dashboard.includes('data-trip-picker-v116')
    && dashboard.includes('data-trip-picker-list-v116')
    && dashboard.includes('setShowTripPicker(true)'),
  'Personal Home keeps Trips, Bills and Receipt without duplicating Goals; Trips opens the Trip picker.',
);

check(
  dashboard.includes('data-home-space-picker-trigger-v116="personal"')
    && dashboard.includes('data-home-space-picker-trigger-v116="business"')
    && dashboard.includes('data-home-space-picker-v116={homeSpacePicker}')
    && dashboard.includes("item.type === 'sme'")
    && dashboard.includes("to={'/business/' + space.id}")
    && dashboard.includes("to={'/spaces/' + space.id}"),
  'Personal and Business Home controls open their matching Space pickers.',
);

check(
  dashboard.indexOf('      {homeSpacePicker && (')
    > dashboard.indexOf('        <GlobalBusinessOverview')
    && dashboard.indexOf('      {showTripPicker && (')
    > dashboard.indexOf('        <GlobalBusinessOverview'),
  'Home Space and Trip pickers render outside the Personal-only branch.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error('- ' + failure);
  }

  throw new Error(
    'v116 context simplification verification failed: '
      + failures.length
      + ' check(s).',
  );
}




console.log('');
console.log('BAJETBN v116 CONTEXT SIMPLIFICATION VERIFICATION PASS');
