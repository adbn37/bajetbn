import assert from 'node:assert/strict';
import fs from 'node:fs';

const settings = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
const repository = fs.readFileSync('src/repositories/releaseCandidateRepository.ts', 'utf8');
const styles = fs.readFileSync('src/styles/global.css', 'utf8');

const checks = [
  [settings, 'data-tool-feedback', 'Feedback is shown beside the data buttons'],
  [settings, 'aria-live="polite"', 'Status messages are announced'],
  [settings, 'Save data file', 'Manual download fallback is shown'],
  [settings, "setDataMessage('Checking your account totals…')", 'Account check shows progress'],
  [settings, "setDataMessage('Preparing your private data file…')", 'Data export shows progress'],
  [settings, 'disabled={dataBusy !== null}', 'Buttons disable only while a task is running'],
  [repository, "rowsForValues('ledgerEntries', 'accountId', accountIds)", 'Account records use account-based queries'],
  [repository, "rowsForValues('sharedBillAssignments', 'spaceId', activeSpaceIds)", 'Shared bill shares use Space-based queries'],
  [repository, "rowsForValues('sharedBillPayments', 'spaceId', activeSpaceIds)", 'Shared payments use Space-based queries'],
  [repository, 'window.setTimeout(() => link.click(), 0)', 'Automatic download is delayed safely'],
  [repository, 'window.setTimeout(() => link.remove(), 1000)', 'Temporary link is not removed immediately'],
  [repository, 'releaseDownloadUrl', 'Object URL can be cleaned up'],
  [styles, '.data-tool-feedback', 'Data feedback layout exists'],
  [styles, '.data-download-link', 'Download fallback layout exists'],
];

for (const [content, marker, label] of checks) {
  assert.equal(content.includes(marker), true, `${label} is missing`);
}

assert.equal(settings.includes('!navigator.onLine'), false, 'Buttons must not silently disable when navigator.onLine is false');
assert.equal(repository.includes("rowsWhere('ledgerEntries', 'ownerId', uid)"), false, 'Blocked ledger owner query must be removed');
assert.equal(repository.includes("rowsWhere('sharedBillPayments', 'memberUid', uid)"), false, 'Blocked shared payment member query must be removed');

console.log(`Data tools hotfix checks passed (${checks.length} structural checks).`);
