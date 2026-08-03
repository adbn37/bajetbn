import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (file, token) => {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
  if (!read(file).includes(token)) throw new Error(`Expected ${file} to contain: ${token}`);
};

const page = 'src/features/transactions/TransactionsPage.tsx';
requireText(page, 'Receipt or document (optional)');
requireText(page, 'Skip this section when you do not have a receipt.');
requireText(page, 'type="file" multiple accept="image/*,application/pdf"');
requireText(page, 'capture="environment"');
requireText(page, 'Save money activity');
requireText(page, 'Save and attach');
requireText(page, 'uploadTransactionAttachment({ transactionId');
requireText(page, "outcome.mode === 'queued'");
requireText(page, 'Money activity was saved on this device, but attachments cannot be queued.');
requireText(page, 'Retry attachments');
requireText(page, 'Finish without remaining attachments');
requireText(page, 'You can also attach files later from Money activity details.');
requireText(page, 'Receipts & documents');
requireText(page, "'Attach file'");
requireText('src/styles/global.css', '.transaction-inline-attachments');
requireText('INLINE_TRANSACTION_ATTACHMENT_HOTFIX.md', 'Receipt upload remains optional.');
requireText('INLINE_TRANSACTION_ATTACHMENT_HOTFIX.md', 'frontend-only hotfix');
requireText('TRANSACTION_RECEIPTS_ALPHA.md', 'transaction is created before selected files are uploaded');
requireText('STAGING_TEST_CHECKLIST.md', 'Save income, expense and transfer without selecting any attachment.');
requireText('package.json', 'verify-inline-transaction-attachments.mjs');

const packageJson = JSON.parse(read('package.json'));
if (packageJson.version !== '0.11.12') throw new Error('Inline attachment hotfix must remain on v0.11.12.');
const release = JSON.parse(read('release.json'));
const hotfixMatch = release.label.match(/Hotfix\s+(\d+)/i);
if (!hotfixMatch || Number(hotfixMatch[1]) < 1) {
  throw new Error('release.json must identify v0.11.12 Hotfix 1 or a later hotfix.');
}

console.log('Inline transaction attachment checks passed (optional selection, direct upload, retry and offline safety).');
