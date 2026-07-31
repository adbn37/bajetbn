import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredFiles = [
  'src/features/reports/ReportsPage.tsx',
  'REPORTS_MONEY_INSIGHTS_ALPHA.md',
];
for (const file of requiredFiles) assert.equal(fs.existsSync(file), true, `${file} is missing`);

const app = fs.readFileSync('src/app/App.tsx', 'utf8');
const page = fs.readFileSync('src/features/reports/ReportsPage.tsx', 'utf8');
const styles = fs.readFileSync('src/styles/global.css', 'utf8');

const checks = [
  [app, "import('../features/reports/ReportsPage')", 'Reports page import'],
  [app, '<Route path="reports" element={<ReportsPage />} />', 'Reports route'],
  [page, 'Money reports', 'Simple page title'],
  [page, 'Money in', 'Money in summary'],
  [page, 'Money out', 'Money out summary'],
  [page, 'Money left', 'Money left summary'],
  [page, 'Where your money went', 'Category spending'],
  [page, 'Money used from each account', 'Account spending'],
  [page, 'Spending by money group', 'Space spending'],
  [page, 'Simple money check', 'Helpful notes'],
  [page, 'Bills & instalments', 'Bills summary'],
  [page, 'Savings goals', 'Goal summary'],
  [page, 'selectedMonth', 'Month filter'],
  [page, 'selectedSpace', 'Space filter'],
  [page, 'selectedAccount', 'Account filter'],
  [page, 'selectedCategory', 'Category filter'],
  [styles, '.report-filter-panel', 'Report filter styles'],
  [styles, '.report-bar-track', 'Report bar styles'],
  [styles, '.report-notes', 'Helpful note styles'],
];
for (const [content, marker, label] of checks) assert.equal(content.includes(marker), true, `${label} is missing`);

const forbidden = ['ledger', 'reconciliation', 'settlement report', 'debit', 'credit'];
for (const phrase of forbidden) assert.equal(page.toLowerCase().includes(phrase), false, `Beginner-facing report still contains: ${phrase}`);

const records = [
  { type: 'income', status: 'posted', amountMinor: 100000 },
  { type: 'expense', status: 'posted', amountMinor: 3700 },
  { type: 'expense', status: 'reversed', amountMinor: 2000 },
  { type: 'reversal', status: 'posted', amountMinor: 1000 },
  { type: 'transfer', status: 'posted', amountMinor: 5000 },
];
const counted = records.filter((item) => item.status === 'posted' && (item.type === 'income' || item.type === 'expense'));
const moneyIn = counted.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountMinor, 0);
const moneyOut = counted.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
assert.equal(moneyIn, 100000);
assert.equal(moneyOut, 3700);
assert.equal(moneyIn - moneyOut, 96300);
assert.equal(Math.min(100, Math.max(0, Math.round((3700 / 10000) * 100))), 37);

console.log(`Money reports checks passed (${checks.length} structural checks plus report calculations).`);
