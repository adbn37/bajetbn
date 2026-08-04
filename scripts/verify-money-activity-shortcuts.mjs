import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (file, token) => {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
  if (!read(file).includes(token)) throw new Error(`Expected ${file} to contain: ${token}`);
};

requireText('src/pages/DashboardPage.tsx', 'Add income or expense');
requireText('src/pages/DashboardPage.tsx', 'setShowMoneyActivity(true)');
requireText('src/pages/DashboardPage.tsx', '<MoneyActivityModal');
requireText('src/pages/DashboardPage.tsx', 'onSubmit={postTransaction}');
requireText('src/features/transactions/TransactionsPage.tsx', "export function MoneyActivityModal");
requireText('src/features/transactions/TransactionsPage.tsx', "'Add receipt'");
requireText('src/features/transactions/TransactionsPage.tsx', 'View receipts (');
requireText('src/features/transactions/TransactionsPage.tsx', 'receiptsOnly');
requireText('src/features/transactions/TransactionsPage.tsx', 'onAttachmentsChanged');
requireText('src/repositories/transactionRepository.ts', 'listAllTransactionAttachments');
requireText('src/styles/global.css', '.receipt-shortcut');
requireText('MONEY_ACTIVITY_SHORTCUTS_HOTFIX.md', 'Receipt upload remains optional.');
requireText('STAGING_TEST_CHECKLIST.md', 'Add receipt');
requireText('package.json', 'verify-money-activity-shortcuts.mjs');

const pkg = JSON.parse(read('package.json'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
if (major === 0 && (minor < 11 || (minor === 11 && patch < 12))) throw new Error('Money Activity shortcuts require BajetBN v0.11.12 or later.');
const release = JSON.parse(read('release.json'));
if (pkg.version === '0.11.12') {
  const match = release.label.match(/Hotfix\s+(\d+)/i);
  if (!match || Number(match[1]) < 3) throw new Error('v0.11.12 must identify Hotfix 3 or later for Money Activity shortcuts.');
}

console.log('Money Activity shortcut checks passed (Overview modal and direct receipt actions).');
