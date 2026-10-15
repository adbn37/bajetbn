/** Static wiring check only. Does not replace typecheck, build or manual UI QA. */
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const file = p => fs.readFileSync(path.join(root,p),'utf8');
const checks = [
  ['src/main.tsx', /import '\.\/styles\/design-motion-v4\.css';/],
  ['src/pages/DashboardPage.tsx', /bajetbn-design-motion-v4/],
  ['src/pages/DashboardPage.tsx', /selectedAccountMonth\.income/],
  ['src/pages/DashboardPage.tsx', /selectedAccountMonth\.expenses/],
  ['src/pages/DashboardPage.tsx', /bajetbn-v4-account-month/],
  ['src/pages/DashboardPage.tsx', /bajetbn-v4-quick-actions/],
  ['src/components/Modal.tsx', /className\?: string/],
  ['src/features/transactions/TransactionsPage.tsx', /bajetbn-v4-money-sheet/],
  ['src/features/transactions/TransactionsPage.tsx', /bajetbn-v4-optional-details/],
  ['src/styles/design-motion-v4.css', /prefers-reduced-motion: reduce/],
];
for (const [name,re] of checks) {
  if (!re.test(file(name))) throw new Error('Phase 4 verification failed: ' + name + ' ' + re);
}
const home = file('src/pages/DashboardPage.tsx');
if (home.indexOf('bajetbn-v4-quick-actions') > home.indexOf('{homeAccounts.length > 0 ? (')) {
  throw new Error('Primary actions must precede the account section');
}
console.log('BajetBN Phase 4: static wiring PASS (not visual/runtime verification)');
