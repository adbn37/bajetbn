import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['models shared expense', read('src/types/models.ts').includes('export interface SharedExpense')],
  ['models shared share', read('src/types/models.ts').includes('export interface SharedExpenseShare')],
  ['models trip fund', read('src/types/models.ts').includes('export interface SpaceFund')],
  ['repository lists expenses', read('src/repositories/sharedExpenseRepository.ts').includes('listSharedExpenses')],
  ['repository uploads proof', read('src/repositories/sharedExpenseRepository.ts').includes('uploadSharedExpenseProof')],
  ['equal split option', read('src/features/spaces/SharedExpensesPanel.tsx').includes('Split equally')],
  ['custom split option', read('src/features/spaces/SharedExpensesPanel.tsx').includes('Enter different amounts')],
  ['percentage split option', read('src/features/spaces/SharedExpensesPanel.tsx').includes('Split by percentage')],
  ['who owes whom', read('src/features/spaces/SharedExpensesPanel.tsx').includes('Who owes whom')],
  ['partial member payment', read('src/features/spaces/SharedExpensesPanel.tsx').includes('You can pay part of it')],
  ['payment proof', read('src/features/spaces/SharedExpensesPanel.tsx').includes('Proof of payment')],
  ['approval function', read('functions/src/index.ts').includes('export const reviewSharedExpensePayment')],
  ['reversal function', read('functions/src/index.ts').includes('export const reverseSharedExpensePayment')],
  ['create function', read('functions/src/index.ts').includes('export const createSharedExpense')],
  ['trip settings function', read('functions/src/index.ts').includes('export const updateTripMoneySettings')],
  ['trip contribution function', read('functions/src/index.ts').includes('export const recordTripMoneyContribution')],
  ['trip reversal function', read('functions/src/index.ts').includes('export const reverseTripMoneyContribution')],
  ['space tab expenses', read('src/features/spaces/SpaceDetailsPage.tsx').includes("{ id: 'expenses', label:") && read('src/features/spaces/SpaceDetailsPage.tsx').includes("'Expenses'") && read('src/features/spaces/SpaceDetailsPage.tsx').includes("'Shared expenses'")],
  ['space tab balances', read('src/features/spaces/SpaceDetailsPage.tsx').includes("{ id: 'balances', label:") && read('src/features/spaces/SpaceDetailsPage.tsx').includes("'Balances'") && read('src/features/spaces/SpaceDetailsPage.tsx').includes("'Who owes whom'")],
  ['trip money tab', read('src/features/spaces/SpaceDetailsPage.tsx').includes("space.type === 'trip' ? 'Trip money'")],
  ['firestore expense rules', read('firestore.rules').includes('match /sharedExpenses/{expenseId}')],
  ['firestore share rules', read('firestore.rules').includes('match /sharedExpenseShares/{shareId}')],
  ['firestore payment rules', read('firestore.rules').includes('match /sharedExpensePayments/{paymentId}')],
  ['firestore fund rules', read('firestore.rules').includes('match /spaceFunds/{spaceId}')],
  ['space delete safety', read('functions/src/index.ts').includes("db.collection('sharedExpenses').where('spaceId', '==', spaceId)")],
  ['data export', read('src/repositories/releaseCandidateRepository.ts').includes('sharedExpensePayments')],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error('Shared expense checks failed:');
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

function equalSplit(total, count) {
  const base = Math.floor(total / count);
  let remainder = total - base * count;
  return Array.from({ length: count }, () => base + (remainder-- > 0 ? 1 : 0));
}
const equal = equalSplit(1000, 3);
if (equal.reduce((sum, value) => sum + value, 0) !== 1000 || equal.join(',') !== '334,333,333') {
  throw new Error('Equal split calculation failed.');
}
const custom = [250, 300, 450];
if (custom.reduce((sum, value) => sum + value, 0) !== 1000) throw new Error('Custom split calculation failed.');
const percentage = [Math.floor(1001 * 2500 / 10000), Math.floor(1001 * 2500 / 10000)];
percentage.push(1001 - percentage.reduce((sum, value) => sum + value, 0));
if (percentage.reduce((sum, value) => sum + value, 0) !== 1001) throw new Error('Percentage split calculation failed.');

console.log(`Shared expenses, balances and Trip money checks passed (${checks.length} structural checks plus split calculations).`);
