import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('src/app/App.tsx');
const spaces = read('src/features/spaces/SpacesPage.tsx');
const accounts = read('src/features/accounts/AccountsPage.tsx');
const budgets = read('src/features/budgets/BudgetsPage.tsx');
const goals = read('src/features/goals/GoalsPage.tsx');
const bills = read('src/features/commitments/CommitmentsPage.tsx');
const transactions = read('src/features/transactions/TransactionsPage.tsx');
const dashboard = read('src/pages/DashboardPage.tsx');
const css = read('src/styles/global.css');
const failures = [];
let checks = 0;

function expect(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

for (const route of ['spaces/archived', 'accounts/closed', 'budgets/archived', 'goals/archived', 'bills/archived', 'categories/archived']) {
  expect(app.includes(`path="${route}"`), `Missing route: ${route}`);
}

for (const [name, source] of [['Spaces', spaces], ['Accounts', accounts], ['Budgets', budgets], ['Goals', goals], ['Bills', bills]]) {
  expect(!source.includes('archived-items-panel'), `${name} still renders inactive records inline.`);
}

expect(spaces.includes('to="/spaces/archived"'), 'Spaces archive button is missing.');
expect(accounts.includes('to="/accounts/closed"'), 'Closed Accounts button is missing.');
expect(budgets.includes('to="/budgets/archived"'), 'Archived Budgets button is missing.');
expect(goals.includes('to="/goals/archived"'), 'Previous Goals button is missing.');
expect(bills.includes('to="/bills/archived"'), 'Stopped Items button is missing.');
expect(transactions.includes('to="/categories/archived"'), 'Hidden Categories button is missing.');

expect(dashboard.includes('home-v110-account-carousel'), 'Overview account carousel is missing.');
expect(!dashboard.includes('home-v110-accounts') && !dashboard.includes('add-account-tile'), 'Legacy duplicate Overview account strip still exists.');
expect(dashboard.includes('transactions?accountId='), 'Overview account tiles do not open filtered money activity.');
expect(transactions.includes('useSearchParams'), 'Money activity does not read the account query parameter.');
expect(transactions.includes('accounts={activeAccounts}'), 'Closed accounts may still appear in new money activity forms.');

expect(css.includes('.archive-card-grid'), 'Archive page layout styles are missing.');
expect(css.includes('.overview-account-grid'), 'Compact Overview account styles are missing.');
expect(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'Mobile two-column grid rule is missing.');
expect(css.includes('.modal-backdrop { align-items:end;'), 'Mobile bottom-sheet modal rule is missing.');
expect(read('src/components/LifecycleConfirmModal.tsx').includes('LifecycleConfirmModal'), 'BajetBN lifecycle confirmation modal is missing.');

for (const [name, source] of [['Spaces', spaces], ['Accounts', accounts], ['Budgets', budgets], ['Bills', bills]]) {
  expect(!source.includes('if (!confirm(') && !source.includes('window.confirm('), `${name} still uses a browser confirmation for lifecycle controls.`);
}
expect(!transactions.includes('if (!window.confirm(message))'), 'Category lifecycle still uses a browser confirmation.');

for (const file of [
  'src/features/spaces/ArchivedSpacesPage.tsx',
  'src/features/accounts/ClosedAccountsPage.tsx',
  'src/features/budgets/ArchivedBudgetsPage.tsx',
  'src/features/goals/ArchivedGoalsPage.tsx',
  'src/features/commitments/ArchivedCommitmentsPage.tsx',
  'src/features/categories/ArchivedCategoriesPage.tsx',
]) {
  expect(fs.existsSync(file), `Missing dedicated archive page: ${file}`);
  if (fs.existsSync(file)) {
    const source = read(file);
    expect(source.includes('Restore') || source.includes('Reopen'), `${file} is missing a restore/reopen action.`);
    expect(source.includes('Delete permanently'), `${file} is missing the safe permanent-delete action.`);
  }
}

if (failures.length) {
  console.error(`Mobile/archive verification failed (${failures.length} of ${checks} checks):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Mobile UX and dedicated archive page checks passed (${checks} structural checks).`);
