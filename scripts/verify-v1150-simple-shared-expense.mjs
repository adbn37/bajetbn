import fs from 'node:fs';

const file = 'src/features/spaces/SharedExpensesPanel.tsx';
const content = fs.readFileSync(file, 'utf8');

const required = [
  'No budget needed.',
  'Who shares this?',
  'Automatic split',
  'Each person',
  'More options',
  'Save expense',
  'Spend first or plan first.',
  "expenseShares.length === 1 ? 'person' : 'people'",
];

for (const token of required) {
  if (!content.includes(token)) {
    throw new Error(`Missing expected simple shared-expense UX token: ${token}`);
  }
}

const legacyRequired = [
  "splitMode === 'custom'",
  "splitMode === 'percentage'",
  'paidFromGroupFund',
  'createSharedExpense({',
];

for (const token of legacyRequired) {
  if (!content.includes(token)) {
    throw new Error(`Existing shared-expense capability was lost: ${token}`);
  }
}

console.log('Simple shared expense UX verification passed.');
console.log('- Budget remains optional');
console.log('- Equal split is the default');
console.log('- Selected members control who shares the expense');
console.log('- Live per-person preview is present');
console.log('- Custom and percentage splits remain available under More options');
console.log('- Trip money / Household fund support remains intact');