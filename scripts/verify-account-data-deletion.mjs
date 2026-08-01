import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };
let checks = 0;

function requireFile(file) {
  checks += 1;
  if (!exists(file)) fail(`Missing account-deletion file: ${file}`);
}

function requireText(file, token) {
  requireFile(file);
  checks += 1;
  if (!read(file).includes(token)) fail(`Expected ${file} to contain: ${token}`);
}

function rejectText(file, pattern, message) {
  requireFile(file);
  checks += 1;
  if (pattern.test(read(file))) fail(message || `Unexpected text found in ${file}: ${pattern}`);
}

const requiredFiles = [
  'ACCOUNT_DATA_DELETION_ALPHA.md',
  'DATA_RETENTION_AND_DELETION.md',
  'src/components/AccountDeletionModal.tsx',
  'src/repositories/accountDeletionRepository.ts',
  'scripts/verify-account-data-deletion.mjs',
  'ACCOUNT_REREGISTRATION_POLICY_ALPHA.md',
];
for (const file of requiredFiles) requireFile(file);

const release = JSON.parse(read('release.json'));
const packageJson = JSON.parse(read('package.json'));
checks += 2;
if (release.version.localeCompare('0.11.6', undefined, { numeric: true }) < 0) fail(`Expected release 0.11.6 or later, found ${release.version}.`);
if (packageJson.version !== release.version) fail('package.json and release.json versions do not match.');

requireText('src/pages/SettingsPage.tsx', 'Delete my account');
requireText('src/pages/SettingsPage.tsx', 'AccountDeletionModal');
requireText('src/pages/SettingsPage.tsx', 'recordAccountDataExport');
requireText('src/pages/SettingsPage.tsx', 'Cancel deletion request');
rejectText('src/pages/SettingsPage.tsx', /Delete my account[^\n]*coming later/i, 'The account-deletion placeholder is still present.');

requireText('src/contexts/AuthContext.tsx', 'reauthenticateWithCredential');
requireText('src/contexts/AuthContext.tsx', 'reauthenticateWithPopup');
requireText('src/contexts/AuthContext.tsx', 'reauthenticateForSensitiveAction');
requireText('src/contexts/AuthContext.tsx', 'getIdToken(true)');

requireText('src/components/AccountDeletionModal.tsx', "confirmation.trim() === 'DELETE'");
requireText('src/components/AccountDeletionModal.tsx', 'cooling-off period');
requireText('src/components/AccountDeletionModal.tsx', 'Download your data first');
requireText('src/components/AccountDeletionModal.tsx', 'Deleted member');

requireText('src/repositories/accountDeletionRepository.ts', "httpsCallable(functions, 'checkAccountDeletionEligibility')");
requireText('src/repositories/accountDeletionRepository.ts', "httpsCallable(functions, 'requestAccountDeletion')");
requireText('src/repositories/accountDeletionRepository.ts', "httpsCallable(functions, 'cancelAccountDeletion')");
requireText('src/repositories/accountDeletionRepository.ts', 'crypto.randomUUID()');

requireText('functions/src/index.ts', 'export const checkAccountDeletionEligibility');
requireText('functions/src/index.ts', 'export const recordAccountDataExport');
requireText('functions/src/index.ts', 'export const requestAccountDeletion');
requireText('functions/src/index.ts', 'export const cancelAccountDeletion');
requireText('functions/src/index.ts', 'export const processAccountDeletionRequests');
requireText('functions/src/index.ts', 'export const transferSpaceOwnership');
requireText('functions/src/index.ts', 'accountDeletionCoolingOffDays = 7');
requireText('functions/src/index.ts', 'accountReRegistrationCooldownDays = 30');
requireText('functions/src/index.ts', 'recentAuthenticationSeconds = 5 * 60');
requireText('functions/src/index.ts', 'recentExportMilliseconds = 24 * 60 * 60 * 1000');
requireText('functions/src/index.ts', 'accountDeletionTokenDrainMilliseconds = 2 * 60 * 60 * 1000');
requireText('functions/src/index.ts', 'getAuth().updateUser(uid, { disabled: true })');
requireText('functions/src/index.ts', 'getAuth().revokeRefreshTokens(uid)');
requireText('functions/src/index.ts', "request.data?.confirmation !== 'DELETE'");
requireText('functions/src/index.ts', 'getAuth().deleteUser(uid)');
requireText('functions/src/index.ts', 'deleteStorageForAccount(uid, proofPaths)');
requireText('functions/src/index.ts', 'sharedHistoryAnonymized: true');
requireText('functions/src/index.ts', 'anonymousSharedBillAssignmentId');
requireText('functions/src/index.ts', "createHash('sha256')");
requireText('functions/src/index.ts', "schedule: '15 * * * *'");
requireText('functions/src/index.ts', "timeZone: 'Asia/Brunei'");
requireText('functions/src/index.ts', 'deletedMemberName = \'Deleted member\'');

requireText('src/features/collaboration/CollaborationPage.tsx', 'Make owner');
requireText('src/features/collaboration/CollaborationPage.tsx', "kind: 'transfer-owner'");
requireText('src/repositories/collaborationRepository.ts', "httpsCallable(functions, 'transferSpaceOwnership')");

requireText('firestore.rules', 'match /accountDeletionRequests/{uid}');
requireText('firestore.rules', 'allow read: if isSelf(uid)');
requireText('firestore.rules', 'match /accountDeletionCommands/{commandId}');
requireText('firestore.rules', 'match /accountDeletionAudit/{auditId}');
requireText('firestore.rules', 'match /deletedUsers/{anonymousId}');
requireText('firestore.rules', 'match /accountRegistrationRestrictions/{emailHash}');

const audit = JSON.parse(read('scope/pre-v1-scope.json'));
const deletionItem = audit.items.find((item) => item.id === 'data.delete_account');
checks += 2;
if (!deletionItem) fail('The scope register does not contain data.delete_account.');
if (!['manual_test', 'complete'].includes(deletionItem.status)) fail('Account deletion must be marked manual_test or complete after source implementation.');

requireText('package.json', 'verify-account-data-deletion.mjs');
requireText('STAGING_TEST_CHECKLIST.md', 'v0.11.6 — Account and Data Deletion');
requireText('ACCOUNT_DATA_DELETION_ALPHA.md', 'seven-day cooling-off period');
requireText('DATA_RETENTION_AND_DELETION.md', 'Shared bills, payments and settlements');

console.log(`Account and data deletion checks passed (${checks} structural checks plus retention safeguards).`);
console.log(`Scope status: ${deletionItem.status}. Complete the disposable-user staging matrix before production.`);
