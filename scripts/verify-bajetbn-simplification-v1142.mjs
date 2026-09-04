import fs from 'node:fs';
const read = (file) => fs.readFileSync(file, 'utf8');
const shell = read('src/layouts/AppShell.tsx');
const spaces = read('src/features/spaces/SpacesPage.tsx');
const onboarding = read('src/features/onboarding/OnboardingPage.tsx');
const more = read('src/pages/MorePage.tsx');
const hub = read('src/features/spaces/SpaceActionHub.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const trip = read('src/features/spaces/TripPlanningPanel.tsx');
const marketplace = read('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx');
const wizard = read('src/features/business/BusinessWizardPage.tsx');

const failures = [];
function check(value, message) {
  if (value) console.log('PASS:', message);
  else { failures.push(message); console.error('FAIL:', message); }
}

check(shell.includes('<small>Home</small>') && shell.includes('<small>Money</small>') && shell.includes('<small>Spaces</small>') && shell.includes('<small>More</small>'), 'Global navigation is personal-budget first.');
check(spaces.includes("item.type !== 'personal'") && spaces.includes('Personal money does not need a Space.'), 'Personal Space is hidden from normal Space discovery.');
for (const legacyOption of ['<option value="goal">Goal</option>', '<option value="collection">Collection</option>', '<option value="vehicle">Vehicle</option>', '<option value="property">Property</option>', '<option value="asset">Asset</option>']) {
  check(!spaces.includes(legacyOption), 'New Space creation omits personal-only type: ' + legacyOption);
}
check(onboarding.includes('You do not need a Space for normal personal budgeting.') && onboarding.includes('/?welcome=1'), 'Onboarding teaches the new mental model.');
check(more.includes('data-simplified-more') && !more.includes('NAVIGATION_DESCRIPTIONS'), 'Global More is compact.');
check(read('src/pages/DashboardPage.tsx').includes('listPersonalAccounts') && read('src/features/accounts/AccountsPage.tsx').includes('listAllPersonalAccounts'), 'Home and Accounts are personal-budget scoped.');
check(read('src/features/reports/ReportsPage.tsx').includes('personalSpace') && read('src/features/recurring/RecurringTransactionsPage.tsx').includes('personalSpace'), 'Planning and reports remain personal outside Spaces.');
check(hub.includes('data-simplified-space-navigation'), 'Space launcher simplification is active.');
check(
  details.includes('const showDetailedSpaceOverviews = () => false;')
  && details.includes("showDetailedSpaceOverviews() && activeTab === 'overview' && space.type === 'trip'")
  && details.includes("showDetailedSpaceOverviews() && activeTab === 'overview' && space.type === 'household'")
  && details.includes("showDetailedSpaceOverviews() && activeTab === 'overview' && space.type === 'sme'"),
  'Detailed duplicate dashboards are hidden.',
);
check(trip.includes('trip-planning-tabs') && trip.includes("hidden={planningView !== 'bookings'}"), 'Trip Plan uses focused tabs.');
check(marketplace.includes('data-marketplace-pos-more') && marketplace.includes('primaryTabOrder'), 'Marketplace POS keeps primary tabs focused.');
check(wizard.includes('Multi-Seller Shop') && wizard.includes('What does this shop mainly sell?'), 'Marketplace wording is simplified.');

if (failures.length) throw new Error('BajetBN simplification verification failed: ' + failures.length + ' check(s).');
console.log('BAJETBN PERSONAL-FIRST SIMPLIFICATION PASS');
