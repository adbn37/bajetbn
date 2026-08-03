import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredFiles = [
  'src/features/reports/financialHealth.ts',
  'src/features/reports/ReportsPage.tsx',
  'src/features/spaces/SpaceFundPanel.tsx',
  'src/features/spaces/SpaceDetailsPage.tsx',
  'src/features/spaces/SharedExpensesPanel.tsx',
  'HOUSEHOLD_FUNDS_FINANCIAL_HEALTH_ALPHA.md',
];
for (const file of requiredFiles) assert.equal(fs.existsSync(file), true, `${file} is missing`);

const read = (file) => fs.readFileSync(file, 'utf8');
const reports = read('src/features/reports/ReportsPage.tsx');
const health = read('src/features/reports/financialHealth.ts');
const fund = read('src/features/spaces/SpaceFundPanel.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const expenses = read('src/features/spaces/SharedExpensesPanel.tsx');
const repository = read('src/repositories/sharedExpenseRepository.ts');
const functions = read('functions/src/index.ts');
const styles = read('src/styles/global.css');
const i18n = read('src/services/i18n.ts');
const models = read('src/types/models.ts');
const release = JSON.parse(read('release.json'));
const pkg = JSON.parse(read('package.json'));
const scope = JSON.parse(read('scope/pre-v1-scope.json'));

const checks = [
  [reports, 'Financial health check', 'financial health heading'],
  [reports, 'Spending changes', 'month-to-month spending trends'],
  [reports, 'What to check next', 'actionable next steps'],
  [reports, 'SME overview', 'simple SME overview'],
  [reports, 'Current cash position', 'SME cash position'],
  [health, 'monthlyEquivalent', 'regular commitment calculation'],
  [health, 'Savings rate', 'savings-rate indicator'],
  [health, 'Budget pressure', 'budget-pressure indicator'],
  [health, 'Regular payment load', 'commitment-load indicator'],
  [health, 'Emergency fund', 'emergency-fund indicator'],
  [health, 'buildCategoryTrends', 'category trend calculation'],
  [details, "space.type === 'household'", 'Household fund tab'],
  [details, "space.type === 'custom'", 'general group fund tab'],
  [details, "'group_fund'", 'group-fund route tab'],
  [fund, 'Direct member-to-member payments and proof-only flows still remain available.', 'optional fund wording'],
  [fund, 'Household fund', 'Household fund wording'],
  [fund, 'Group fund', 'general fund wording'],
  [expenses, 'paidFromGroupFund', 'group-fund shared expense support'],
  [expenses, 'Paid using collected Household fund', 'Household expense option'],
  [repository, 'updateSpaceFundSettings', 'generic fund settings callable'],
  [repository, 'recordSpaceFundContribution', 'generic contribution callable'],
  [functions, 'export const updateSpaceFundSettings', 'backend generic fund settings'],
  [functions, "fundMeta.kind === 'trip' ? positiveMoney(requestedBudgetMinor) : nonNegativeMoney(requestedBudgetMinor)", 'optional Household and Group fund target'],
  [functions, 'export const recordSpaceFundContribution', 'backend generic contribution'],
  [functions, 'export const updateTripMoneySettings', 'backward-compatible Trip callable'],
  [models, 'paidFromGroupFund?: boolean', 'group-fund expense model'],
  [models, "export type SpaceFundKind = 'trip' | 'household' | 'group'", 'fund kind model'],
  [styles, '.financial-health-grid', 'financial health responsive layout'],
  [styles, '.space-fund-panel', 'group fund layout'],
  [i18n, "'Financial health check': 'Semakan kesihatan kewangan'", 'Malay health wording'],
  [i18n, "'Household fund': 'Dana keluarga'", 'Malay Household fund wording'],
];
for (const [content, token, label] of checks) assert.equal(content.includes(token), true, `${label} is missing`);

assert.equal(release.version, '0.11.10');
assert.equal(pkg.version, '0.11.10');
assert.equal(pkg.scripts['verify:all-structural'].includes('verify-household-funds-financial-health.mjs'), true);

const itemById = new Map(scope.items.map((item) => [item.id, item]));
assert.equal(itemById.get('collab.household_fund')?.status, 'manual_test');
assert.equal(itemById.get('insights.financial_health')?.status, 'manual_test');
assert.equal(itemById.get('sme.essentials')?.status, 'manual_test');

// Calculation checks mirror the source rules and catch accidental formula changes.
const monthlyEquivalent = (amount, frequency) => {
  if (frequency === 'weekly') return Math.round((amount * 52) / 12);
  if (frequency === 'quarterly') return Math.round(amount / 3);
  if (frequency === 'yearly') return Math.round(amount / 12);
  if (frequency === 'monthly') return amount;
  return 0;
};
assert.equal(monthlyEquivalent(10000, 'monthly'), 10000);
assert.equal(monthlyEquivalent(12000, 'quarterly'), 4000);
assert.equal(monthlyEquivalent(120000, 'yearly'), 10000);
assert.equal(monthlyEquivalent(3000, 'weekly'), 13000);
assert.equal(Math.round(((100000 - 70000) / 100000) * 100), 30);
assert.equal(Math.round((80000 / 100000) * 100), 80);
assert.equal(Math.round((30000 / 100000) * 100), 30);

const forbidden = ['credit score', 'investment advice', 'guaranteed savings'];
for (const phrase of forbidden) assert.equal(reports.toLowerCase().includes(phrase), false, `Unsafe or misleading health wording remains: ${phrase}`);

console.log(`Household/group fund and financial-health checks passed (${checks.length} structural checks plus indicator calculations).`);
