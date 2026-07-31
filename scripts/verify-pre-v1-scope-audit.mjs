import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };
const requireText = (file, token) => {
  if (!exists(file)) fail(`Missing audit evidence file: ${file}`);
  if (!read(file).includes(token)) fail(`Expected ${file} to contain: ${token}`);
};

const auditFile = 'scope/pre-v1-scope.json';
if (!exists(auditFile)) fail(`Missing ${auditFile}`);
const audit = JSON.parse(read(auditFile));
const allowedStatuses = new Set(['complete', 'manual_test', 'partial', 'missing', 'deferred']);
const allowedGates = new Set(['pre_production', 'pre_v1', 'pre_v1_decision', 'post_v1']);

if (!Array.isArray(audit.items) || audit.items.length < 45) fail('The pre-v1 scope register is unexpectedly incomplete.');
const ids = new Set();
for (const item of audit.items) {
  if (!item.id || ids.has(item.id)) fail(`Missing or duplicate scope item ID: ${item.id}`);
  ids.add(item.id);
  if (!allowedStatuses.has(item.status)) fail(`Invalid status for ${item.id}: ${item.status}`);
  if (!allowedGates.has(item.gate)) fail(`Invalid gate for ${item.id}: ${item.gate}`);
  if (!Array.isArray(item.evidence) || item.evidence.length === 0) fail(`No evidence recorded for ${item.id}`);
  for (const file of item.evidence) if (!exists(file)) fail(`Evidence for ${item.id} is missing: ${file}`);
}

// Core implemented evidence.
requireText('src/types/models.ts', "export type SpaceType = 'personal' | 'household' | 'sme' | 'trip' | 'goal' | 'custom'");
requireText('src/types/models.ts', "export type SharedExpenseSplitMode = 'equal' | 'custom' | 'percentage'");
requireText('src/features/spaces/SharedExpensesPanel.tsx', 'Who owes whom');
requireText('src/features/spaces/TripMoneyPanel.tsx', 'Trip money');
requireText('src/app/App.tsx', 'spaces/archived');
requireText('src/app/App.tsx', 'accounts/closed');
requireText('src/app/App.tsx', '<Navigate to="/spaces" replace />');
requireText('src/pages/SettingsPage.tsx', 'Download my data');

// Known gaps must remain explicitly represented until fixed and the audit is updated.
requireText('src/pages/SettingsPage.tsx', 'Delete my account — coming later');
requireText('src/features/accounts/AccountsPage.tsx', 'Institution or provider');
requireText('src/features/spaces/SpaceDetailsPage.tsx', "space.type === 'trip'");
requireText('README.md', 'Offline mutation queues are deferred');
requireText('storage.rules', 'General receipts remain reserved');

const nativeConfirmFiles = [
  'src/features/transactions/TransactionsPage.tsx',
  'src/features/goals/GoalsPage.tsx',
  'src/features/spaces/SharedExpensesPanel.tsx',
  'src/features/spaces/TripMoneyPanel.tsx',
  'src/features/collaboration/CollaborationPage.tsx',
];
if (!nativeConfirmFiles.some((file) => /\b(?:window\.)?confirm\s*\(/.test(read(file)))) {
  fail('The audit still marks native confirmations as partial, but no native confirm calls remain. Update the scope register.');
}

const packageVersion = JSON.parse(read('package.json')).version;
const settingsVersionMatch = read('src/pages/SettingsPage.tsx').match(/App:\s*(v[^·<]+)/);
if (!settingsVersionMatch) fail('Could not find the user-facing Settings version.');
if (`v${packageVersion}` === settingsVersionMatch[1].trim()) {
  fail('Version sources now match. Update the audit item release.version_source to complete.');
}

// CI must include all current regression suites after this audit patch.
const ci = read('.github/workflows/staging-ci.yml');
const requiredCiChecks = [
  'verify-safe-delete-archive-restore.mjs',
  'verify-mobile-archive-pages.mjs',
  'verify-invitations-notifications.mjs',
  'verify-shared-expenses-balances.mjs',
  'verify-space-centred-workflow.mjs',
  'verify-pre-v1-scope-audit.mjs',
];
for (const check of requiredCiChecks) if (!ci.includes(check)) fail(`Staging CI does not run ${check}`);

const counts = audit.items.reduce((result, item) => {
  result[item.status] = (result[item.status] || 0) + 1;
  return result;
}, {});
const blockers = audit.items.filter((item) => item.gate === 'pre_production' && item.status !== 'complete');
const preV1Open = audit.items.filter((item) => ['pre_v1', 'pre_v1_decision'].includes(item.gate) && !['complete', 'deferred'].includes(item.status));

console.log(`Pre-v1 scope audit passed (${audit.items.length} registered requirements).`);
console.log(`Status counts: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ')}.`);
console.log(`Open pre-production blockers: ${blockers.length}. Open pre-v1 items/decisions: ${preV1Open.length}.`);
