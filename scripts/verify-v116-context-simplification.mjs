import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\\r\\n?/g, '\\n');

const transactions = read('src/features/transactions/TransactionsPage.tsx');
const businessMoney = read('src/features/business/BusinessMoneyActivityPage.tsx');
const dashboard = read('src/pages/DashboardPage.tsx');
const more = read('src/pages/MorePage.tsx');
const goals = read('src/features/goals/GoalsPage.tsx');
const spacesPage = read('src/features/spaces/SpacesPage.tsx');
const hub = read('src/features/spaces/SpaceActionHub.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const styles = read('src/styles/global.css');

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
  more.includes("{ to: '/goals', label: 'Goals', icon: 'goals' }")
    && more.includes("{ to: '/spaces', label: 'Spaces', icon: 'spaces' }")
    && more.includes('more-shortcut-grid-v116')
    && more.includes('function MoreIcon')
    && more.includes('more-signout-v116')
    && !more.includes('listSpaces')
    && !more.includes('<SpaceAvatar'),
  'More keeps Spaces behind one shortcut and uses polished grid launchers.',
);

check(
  goals.includes('data-goals-plan-hub-v116')
    && goals.includes('setGoals(nextGoals);')
    && goals.includes('setContributions(nextContributions);')
    && goals.includes('visibleGoals')
    && goals.includes('to="/debt"')
    && !goals.includes('<SpaceAvatar space={plan} />'),
  'Goals presents personal, Space-owned savings goals and legacy Plan targets in one view.',
);

check(
  spacesPage.includes("item.type !== 'goal'")
    && !spacesPage.includes('<option value="goal">Plan / saving goal</option>'),
  'New saving Plans are goals rather than Spaces; existing Plan data remains compatible.',
);

check(
  goals.includes("'Plan'") && !goals.includes("'Legacy plan'")
    && goals.includes("['spaces', 'Space goals']")
    && goals.includes('goal-card-more-v116')
    && goals.includes('goals-debt-shortcut-v116')
    && goals.includes('View plan details →')
    && !goals.includes('Open Plan workspace'),
  'Goals mobile UI keeps legacy Plan compatibility while simplifying user-facing actions.',
);

check(
  /const\s+HOME_SHORTCUT_DEFAULTS:\s*HomeShortcutId\[\]\s*=\s*\[\s*'trips',\s*'bills',\s*'goals',\s*'budgets',\s*'recurring',\s*'subscription',\s*\]/m.test(dashboard)
    && dashboard.includes("id: 'receipt'")
    && dashboard.includes("label: 'Subscription'")
    && dashboard.includes('data-home-shortcut-grid-v116')
    && dashboard.includes('data-trip-picker-v116')
    && dashboard.includes('data-trip-picker-list-v116')
    && !dashboard.includes('personal-trip-shortcuts-v116')
    && !dashboard.includes('personal-trip-shortcut-rail-v116')
    && !dashboard.includes('personalTripSpaces.slice(0, 4)'),
  'Personal Home defaults to Trips, Bills, Goals, Budgets, Recurring and Subscription; Receipt remains optional.',
);

check(
  dashboard.includes('data-home-shortcut-editor-v116')
    && dashboard.includes('HOME_SHORTCUT_STORAGE_PREFIX')
    && dashboard.includes('window.localStorage.setItem')
    && dashboard.includes('homeShortcutDraft')
    && dashboard.includes("id: 'goals'")
    && dashboard.includes("id: 'reports'")
    && dashboard.includes("id: 'debt'")
    && dashboard.includes('`space:${space.id}`')
    && dashboard.includes("space.type === 'sme'")
    && dashboard.includes("'/business/' + space.id")
    && dashboard.includes("'/spaces/' + space.id"),
  'Home shortcut editor supports saved custom app and Space destinations.',
);

check(
  dashboard.includes('data-home-overview-trigger-v116="personal"')
    && dashboard.includes('data-home-overview-trigger-v116="business"')
    && dashboard.includes('data-home-space-picker-trigger-v116="personal"')
    && dashboard.includes('data-home-space-picker-trigger-v116="business"')
    && dashboard.includes("selectHomeMode('personal')")
    && dashboard.includes("selectHomeMode('business')")
    && dashboard.includes("openHomeSpacePicker('personal')")
    && dashboard.includes("openHomeSpacePicker('business')")
    && dashboard.includes('data-home-space-picker-v116={homeSpacePicker}')
    && dashboard.includes("item.type === 'sme'")
    && dashboard.includes("to={'/business/' + space.id}")
    && dashboard.includes("to={'/spaces/' + space.id}"),
  'Personal and Business labels switch overview while separate arrows open their matching Space pickers.',
);

check(
  (() => {
    const pickerStart =
      dashboard.indexOf(
        'function openHomeSpacePicker(',
      );

    const pickerEnd =
      dashboard.indexOf(
        'function openShortcutEditor(',
        pickerStart,
      );

    if (
      pickerStart === -1
      || pickerEnd <= pickerStart
    ) {
      return false;
    }

    const pickerBody =
      dashboard.slice(
        pickerStart,
        pickerEnd,
      );

    return pickerBody.includes(
      'setHomeSpacePicker(nextMode);',
    )
      && !pickerBody.includes(
        'selectHomeMode(',
      )
      && !pickerBody.includes(
        'setSearchParams(',
      );
  })(),
  'Opening a Home Space picker does not change the current overview.',
);

check(
  dashboard.indexOf('      {homeSpacePicker && (')
    > dashboard.indexOf('        <GlobalBusinessOverview')
    && dashboard.indexOf('      {showTripPicker && (')
    > dashboard.indexOf('        <GlobalBusinessOverview'),
  'Home Space and Trip pickers render outside the Personal-only branch.',
);


check(
  (() => {
    const pickerStart = dashboard.indexOf('const personalPickerSpaces =');
    const businessStart = dashboard.indexOf('const businessSpaces =', pickerStart);
    const markupStart = dashboard.indexOf("{homeSpacePicker === 'personal' ? (");
    const markupEnd = dashboard.indexOf(') : businessSpaces.length > 0 ? (', markupStart);

    return pickerStart !== -1
      && businessStart > pickerStart
      && markupStart !== -1
      && markupEnd > markupStart
      && dashboard.slice(pickerStart, businessStart).includes("item.type !== 'trip'")
      && dashboard.slice(markupStart, markupEnd).includes('personalPickerSpaces.map((space)')
      && !dashboard.slice(markupStart, markupEnd).includes('quickPersonalSpaces.map((space)')
      && dashboard.includes('personalTripSpaces.map((trip)')
      && dashboard.includes('spaces={quickPersonalSpaces}');
  })(),
  'Trip Spaces appear in Trips, not Personal Spaces, while Personal money entry still supports Trip context.',
);


check(
  details.includes('className="trip-workbook-tabs-v115"')
    && details.includes('TRIP_WORKBOOK_PRIMARY_SHEETS.map')
    && styles.includes('BAJETBN V116 TRIP MOBILE TAB POLISH V12')
    && styles.includes('scroll-snap-type: x proximity')
    && styles.includes('min-height: 40px')
    && styles.includes('font-size: .78rem'),
  'Trip workbook tabs remain swipeable with readable mobile touch targets.',
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
