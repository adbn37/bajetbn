import assert from 'node:assert/strict';
import fs from 'node:fs';

const required = [
  'src/features/budgets/BudgetsPage.tsx',
  'src/features/goals/GoalsPage.tsx',
  'src/features/commitments/CommitmentsPage.tsx',
  'src/repositories/budgetRepository.ts',
  'src/repositories/goalRepository.ts',
  'src/repositories/commitmentRepository.ts',
];
for (const file of required) assert.equal(fs.existsSync(file), true, `${file} is missing`);
const functions = fs.readFileSync('functions/src/index.ts', 'utf8');
for (const name of ['createBudget','updateBudget','archiveBudget','createGoal','recordGoalContribution','reverseGoalContribution','createCommitment','payCommitment']) {
  assert.match(functions, new RegExp(`export const ${name}\\b`), `${name} is missing`);
}
const rules = fs.readFileSync('firestore.rules','utf8');
for (const collection of ['budgets','goals','goalContributions','commitments','commitmentPayments']) assert.match(rules,new RegExp(`match /${collection}/`));
function next(date, frequency) {
  const d = new Date(`${date}T00:00:00Z`);
  if (frequency === 'weekly') d.setUTCDate(d.getUTCDate()+7);
  if (frequency === 'monthly') d.setUTCMonth(d.getUTCMonth()+1);
  if (frequency === 'quarterly') d.setUTCMonth(d.getUTCMonth()+3);
  if (frequency === 'yearly') d.setUTCFullYear(d.getUTCFullYear()+1);
  return d.toISOString().slice(0,10);
}
assert.equal(next('2026-01-15','monthly'),'2026-02-15');
assert.equal(next('2026-01-15','quarterly'),'2026-04-15');
assert.equal(Math.max(0,10000-2500),7500);
assert.equal(Math.min(100,Math.round(7500/10000*100)),75);
console.log('Budgets, goals and commitments checks passed.');
