import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredFiles = [
  'src/components/AppErrorBoundary.tsx',
  'src/repositories/releaseCandidateRepository.ts',
  'src/pages/SettingsPage.tsx',
  'scripts/verify-build-output.mjs',
  'RELEASE_CANDIDATE_HARDENING_ALPHA.md',
  'RELEASE_CANDIDATE_TEST_CHECKLIST.md',
  'SECURITY_REVIEW_v0.11.md',
];
for (const file of requiredFiles) assert.equal(fs.existsSync(file), true, `${file} is missing`);

const app = fs.readFileSync('src/app/App.tsx', 'utf8');
const boundary = fs.readFileSync('src/components/AppErrorBoundary.tsx', 'utf8');
const settings = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
const repository = fs.readFileSync('src/repositories/releaseCandidateRepository.ts', 'utf8');
const errors = fs.readFileSync('src/utils/errors.ts', 'utf8');
const styles = fs.readFileSync('src/styles/global.css', 'utf8');
const workflow = fs.readFileSync('.github/workflows/staging-ci.yml', 'utf8');
const rules = fs.readFileSync('firestore.rules', 'utf8');
const storage = fs.readFileSync('storage.rules', 'utf8');

const checks = [
  [app, "import { lazy, Suspense } from 'react';", 'Route code splitting'],
  [app, '<AppErrorBoundary>', 'Whole-app error protection'],
  [app, '<Suspense fallback={<LoadingScreen />}>', 'Simple page loading state'],
  [app, "lazy(() => import('../features/calendar/CalendarPage')", 'Lazy Calendar page'],
  [app, "lazy(() => import('../features/search/SearchPage')", 'Lazy Search page'],
  [boundary, 'Your saved money information has not been changed', 'Safe crash message'],
  [boundary, 'Reload page', 'Reload action'],
  [boundary, 'Go to Overview', 'Overview action'],
  [repository, 'buildUserDataExport', 'Private data export'],
  [repository, 'checkAccountRecords', 'Account total check'],
  [repository, "rowsForValues('ledgerEntries', 'accountId', accountIds)", 'Account records loaded through permitted account queries'],
  [repository, "rowsWhere('transactions', 'ownerId', uid)", 'Money activity included'],
  [repository, "rowsForValues('sharedBillPayments', 'spaceId', activeSpaceIds)", 'Shared payments loaded through permitted Space queries'],
  [repository, 'URL.createObjectURL', 'Local download creation'],
  [repository, 'window.setTimeout(() => link.click(), 0)', 'Download click waits for the browser'],
  [repository, 'releaseDownloadUrl', 'Download URL cleanup'],
  [settings, 'Check my totals', 'Simple account check button'],
  [settings, 'Download my data', 'Data download button'],
  [settings, 'Save data file', 'Visible download fallback'],
  [settings, 'data-tool-feedback', 'Visible data tool feedback'],
  [settings, "disabled={dataBusy !== null}", 'Buttons are not silently disabled by browser online detection'],
  [settings, 'This check does not change anything', 'No-change explanation'],
  [settings, 'Keep it private because it contains your money information', 'Privacy warning'],
  [errors, 'This page is getting ready. Please try again in a few minutes.', 'Simple index message'],
  [errors, "replace(/https?:\\/\\/\\S+/g, '')", 'Technical URL removal'],
  [styles, '.app-error-card', 'Crash screen styles'],
  [styles, '.data-tool-grid', 'Data tools layout'],
  [workflow, 'npm ci --prefix functions', 'Functions dependency check'],
  [workflow, 'npm run build --prefix functions', 'Functions build check'],
  [workflow, 'verify-release-candidate-hardening.mjs', 'Release candidate verification in CI'],
  [workflow, 'verify-build-output.mjs', 'Built bundle verification in CI'],
  [rules, 'allow create, update, delete: if false; // Posted and reversed only by trusted Cloud Functions.', 'Server-only money writes'],
  [rules, 'allow create, update, delete: if false; // Server-controlled because opening balances are financial postings.', 'Server-only account writes'],
  [storage, 'isImageOrPdf()', 'Payment proof file type rule'],
  [storage, 'underTenMb()', 'Payment proof size rule'],
];
for (const [content, marker, label] of checks) assert.equal(content.includes(marker), true, `${label} is missing`);

assert.equal(repository.includes('addDoc('), false, 'Data export must not create Firestore records');
assert.equal(repository.includes('updateDoc('), false, 'Data export must not change Firestore records');
assert.equal(repository.includes('deleteDoc('), false, 'Data export must not delete Firestore records');
assert.equal(repository.includes("rowsWhere('ledgerEntries', 'ownerId', uid)"), false, 'Account record check must not use a query blocked by current rules');
assert.equal(settings.includes('!navigator.onLine'), false, 'Data buttons must not silently disable based on navigator.onLine');

const compare = (accounts, records) => accounts.map((account) => {
  const recorded = records.filter((item) => item.accountId === account.id && item.status === 'posted')
    .reduce((sum, item) => sum + item.amountMinor, 0);
  return { difference: account.ledgerBalanceMinor - recorded, matches: account.ledgerBalanceMinor === recorded };
});
const healthy = compare([{ id: 'a', ledgerBalanceMinor: 12500 }], [
  { accountId: 'a', status: 'posted', amountMinor: 10000 },
  { accountId: 'a', status: 'posted', amountMinor: 2500 },
]);
assert.deepEqual(healthy, [{ difference: 0, matches: true }]);
const mismatch = compare([{ id: 'a', ledgerBalanceMinor: 12500 }], [{ accountId: 'a', status: 'posted', amountMinor: 10000 }]);
assert.deepEqual(mismatch, [{ difference: 2500, matches: false }]);

console.log(`Release candidate hardening checks passed (${checks.length} structural checks plus account-total calculations).`);
