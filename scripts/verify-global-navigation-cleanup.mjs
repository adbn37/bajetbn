import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const navigation = read('src/services/personalisation.ts');
const shell = read('src/layouts/AppShell.tsx');
const morePage = read('src/pages/MorePage.tsx');

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

for (const id of ['overview', 'spaces', 'transactions', 'accounts', 'budgets', 'bills', 'search']) {
  check(navigation.includes(`'${id}'`), `Navigation is missing ${id}.`);
}
check(navigation.includes('CORE_NAVIGATION_ORDER'), 'Core navigation order is missing.');
check(navigation.includes("'overview'") && navigation.includes("'transactions'") && navigation.includes("'spaces'") && navigation.includes("'inbox'"), 'Home, Money, Spaces and Attention remain core.');
check(navigation.includes('return [];'), 'Secondary desktop tools stay out of the main navigation.');

const start = shell.indexOf('<nav className="mobile-bottom-nav"');
const end = shell.indexOf('</nav>', start);
const mobile = start >= 0 && end > start ? shell.slice(start, end) : '';
for (const token of ['<small>Home</small>', '<small>Money</small>', 'mobile-bottom-add', '<small>Spaces</small>', '<small>More</small>']) {
  check(mobile.includes(token), `Mobile navigation missing ${token}.`);
}
check(mobile.includes('to="/transactions"'), 'Mobile Money destination is missing.');
check(mobile.includes("navigate('/?quick=1')"), 'Mobile Add action is missing.');
check(mobile.includes('to="/spaces"'), 'Mobile Spaces destination is missing.');
check(mobile.includes('to="/more"'), 'Mobile More destination is missing.');
check(morePage.includes('data-simplified-more'), 'More page simplification marker is missing.');
check(!morePage.includes('NAVIGATION_DESCRIPTIONS'), 'More no longer repeats descriptions for every tool.');
check(
  morePage.includes('Sign out')
    && (
      morePage.includes('to="/settings"')
      || morePage.includes("to: '/settings'")
    )
    && (
      morePage.includes('to="/subscription"')
      || morePage.includes("to: '/subscription'")
    ),
  'More keeps account essentials.',
);
console.log(`Global navigation cleanup checks passed (${checks} checks).`);
