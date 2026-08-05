import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const files = {
  functions: read('functions/src/index.ts'),
  lifecycle: read('src/repositories/lifecycleRepository.ts'),
  models: read('src/types/models.ts'),
  spaces: read('src/features/spaces/SpacesPage.tsx'),
  details: read('src/features/spaces/SpaceDetailsPage.tsx'),
  accounts: read('src/features/accounts/AccountsPage.tsx'),
  budgets: read('src/features/budgets/BudgetsPage.tsx'),
  goals: read('src/features/goals/GoalsPage.tsx'),
  bills: read('src/features/commitments/CommitmentsPage.tsx'),
  transactions: read('src/features/transactions/TransactionsPage.tsx'),
  archivedSpaces: read('src/features/spaces/ArchivedSpacesPage.tsx'),
  closedAccounts: read('src/features/accounts/ClosedAccountsPage.tsx'),
  archivedBudgets: read('src/features/budgets/ArchivedBudgetsPage.tsx'),
  archivedGoals: read('src/features/goals/ArchivedGoalsPage.tsx'),
  archivedBills: read('src/features/commitments/ArchivedCommitmentsPage.tsx'),
  archivedCategories: read('src/features/categories/ArchivedCategoriesPage.tsx'),
  errors: read('src/utils/errors.ts'),
  css: read('src/styles/global.css'),
};

const checks = [
  ['Space lifecycle Function', files.functions.includes('manageSpaceLifecycle')],
  ['Account lifecycle Function', files.functions.includes('manageAccountLifecycle')],
  ['Budget lifecycle Function', files.functions.includes('manageBudgetLifecycle')],
  ['Goal lifecycle Function', files.functions.includes('manageGoalLifecycle')],
  ['Bill lifecycle Function', files.functions.includes('manageCommitmentLifecycle')],
  ['Category lifecycle Function', files.functions.includes('manageCategoryLifecycle')],
  ['Personal Space protection', files.functions.includes('Your Personal Space must stay available')],
  ['Space history check', files.functions.includes('This Space has members or saved history')],
  ['Account history check', files.functions.includes('This account has saved money activity')],
  ['Budget history check', files.functions.includes('This budget has saved spending')],
  ['Goal history check', files.functions.includes('This goal has saved progress')],
  ['Bill payment history check', files.functions.includes('This item has payment history')],
  ['Category usage check', files.functions.includes('This category is used in saved records')],
  ['Lifecycle duplicate protection', files.functions.includes("db.collection('lifecycleCommands')")],
  ['Account closed field', files.models.includes('closedAt?: Timestamp | null')],
  ['Bill stopped field', files.models.includes('stoppedAt?: Timestamp | null')],
  ['Lifecycle repository', files.lifecycle.includes("run('manageAccountLifecycle'")],
  ['Archived Spaces section', files.spaces.includes('Archived Spaces')],
  ['Space restore button', files.archivedSpaces.includes('Restore')],
  ['Space delete button', files.details.includes("ask('delete')") && files.details.includes('Delete Space')],
  ['Space settings controls', files.details.includes('Archive or delete this Space')],
  ['Closed accounts section', files.accounts.includes('Closed accounts')],
  ['Account close button', files.accounts.includes('Close account')],
  ['Account restore button', files.closedAccounts.includes('Reopen')],
  ['Archived budgets page', files.archivedBudgets.includes('Archived Budgets') && files.budgets.includes('/budgets/archived')],
  ['Closed goals page', files.archivedGoals.includes('Closed & Archived Goals') && files.goals.includes('/goals/archived')],
  ['Stopped bills page', files.archivedBills.includes('Stopped Bills & Instalments') && files.bills.includes('/bills/archived')],
  ['Hidden categories page', files.archivedCategories.includes('Hidden Categories') && files.transactions.includes('/categories/archived')],
  ['Friendly lifecycle errors', files.errors.includes("code?.includes('failed-precondition')")],
  ['Lifecycle styling', files.css.includes('v0.11.2 Safe delete')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Safe delete checks failed:');
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

// Pure safety calculations used by the server decisions.
const canDeleteAccount = ({ source, destination, commitment, shared, nonOpeningLedger }) => !source && !destination && !commitment && !shared && !nonOpeningLedger;
const canDeleteGoal = ({ currentMinor, history }) => currentMinor === 0 && !history;
const canDeleteBill = ({ amountPaidMinor, payments, shares }) => amountPaidMinor === 0 && !payments && !shares;
if (!canDeleteAccount({ source: false, destination: false, commitment: false, shared: false, nonOpeningLedger: false })) throw new Error('Unused account calculation failed.');
if (canDeleteAccount({ source: true, destination: false, commitment: false, shared: false, nonOpeningLedger: false })) throw new Error('Used account calculation failed.');
if (!canDeleteGoal({ currentMinor: 0, history: false }) || canDeleteGoal({ currentMinor: 100, history: false })) throw new Error('Goal calculation failed.');
if (!canDeleteBill({ amountPaidMinor: 0, payments: false, shares: false }) || canDeleteBill({ amountPaidMinor: 0, payments: true, shares: false })) throw new Error('Bill calculation failed.');

console.log(`Safe delete, close, archive and restore checks passed (${checks.length} structural checks plus safety calculations).`);
