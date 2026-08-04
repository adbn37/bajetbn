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
const itemById = new Map(audit.items.map((item) => [item.id, item]));
const deletionStatus = itemById.get('data.delete_account')?.status;
if (['complete', 'manual_test'].includes(deletionStatus)) {
  requireText('src/pages/SettingsPage.tsx', 'AccountDeletionModal');
  requireText('functions/src/index.ts', 'export const processAccountDeletionRequests');
  requireText('functions/src/index.ts', 'getAuth().deleteUser(uid)');
  requireText('firestore.rules', 'match /accountDeletionRequests/{uid}');
  requireText('ACCOUNT_DATA_DELETION_ALPHA.md', 'seven-day cooling-off period');
} else {
  requireText('src/pages/SettingsPage.tsx', 'Delete my account — coming later');
}

const recurringStatus = itemById.get('recurring.transactions')?.status;
if (['complete', 'manual_test'].includes(recurringStatus)) {
  requireText('src/features/recurring/RecurringTransactionsPage.tsx', 'Recurring money');
  requireText('src/repositories/recurringTransactionRepository.ts', 'createRecurringTransactionTemplate');
  requireText('functions/src/index.ts', 'export const processRecurringTransactions');
  requireText('functions/src/index.ts', 'recurringRunId(templateId, scheduledDate)');
  requireText('firestore.rules', 'match /recurringTransactionTemplates/{templateId}');
  requireText('RECURRING_TRANSACTIONS_ALPHA.md', 'duplicate-safe');
}

const backgroundReminderStatus = itemById.get('notifications.reminders')?.status;
if (['complete', 'manual_test'].includes(backgroundReminderStatus)) {
  requireText('functions/src/index.ts', 'export const generateBackgroundReminders');
  requireText('functions/src/index.ts', 'backgroundReminderId(reminderKey)');
  requireText('src/pages/SettingsPage.tsx', 'Prepare reminders while BajetBN is closed');
  requireText('scripts/generate-service-worker.mjs', "self.addEventListener('push'");
  requireText('BACKGROUND_NOTIFICATIONS_ALPHA.md', 'duplicate');
}
requireText('src/features/accounts/AccountsPage.tsx', 'Institution or provider');
requireText('src/features/spaces/SpaceDetailsPage.tsx', "space.type === 'trip'");
const offlineStatus = itemById.get('pwa.offline_mutations')?.status;
if (['complete', 'manual_test'].includes(offlineStatus)) {
  requireText('src/services/offlineQueue.ts', 'MAX_QUEUE_ITEMS = 100');
  requireText('src/repositories/transactionRepository.ts', 'syncQueuedTransactions');
  requireText('src/pages/OfflineSyncPage.tsx', 'Duplicate-safe');
  requireText('src/services/firebase.ts', 'persistentLocalCache');
  requireText('OFFLINE_SYNC_ALPHA.md', 'duplicate-protection key');
} else {
  requireText('README.md', 'Offline mutation queues are deferred');
}
const receiptStatus = itemById.get('data.general_receipts')?.status;
if (['complete', 'manual_test'].includes(receiptStatus)) {
  requireText('src/features/transactions/TransactionsPage.tsx', 'Receipts & documents');
  requireText('src/repositories/transactionRepository.ts', 'uploadTransactionAttachment');
  requireText('functions/src/index.ts', 'export const registerTransactionAttachment');
  requireText('firestore.rules', 'match /transactionAttachments/{attachmentId}');
  requireText('TRANSACTION_RECEIPTS_ALPHA.md', 'images or PDF files');
} else {
  requireText('storage.rules', 'General receipts remain reserved');
}

const posFoundationStatus = itemById.get('sme.pos_foundation')?.status;
if (['complete', 'manual_test'].includes(posFoundationStatus)) {
  requireText('src/features/sme-pos/SmePosPage.tsx', 'Marketplace Consignment POS');
  requireText('src/repositories/smePosRepository.ts', 'saveSmePosSetup');
  requireText('functions/src/index.ts', 'export const saveSmePosSetup');
  requireText('firestore.rules', 'match /smePosSettings/{spaceId}');
  requireText('SME_POS_FOUNDATION_ALPHA.md', 'Standard POS');
}
const standardPosStatus = itemById.get('sme.standard_pos')?.status;
if (['manual_test', 'complete'].includes(standardPosStatus)) {
  requireText('src/features/sme-pos/StandardPosWorkspace.tsx', 'Complete sale');
  requireText('functions/src/index.ts', 'export const checkoutStandardPos');
  requireText('STANDARD_POS_ALPHA.md', 'shop-owned products');
}
const marketplacePosStatus = itemById.get('sme.marketplace_pos')?.status;
if (['manual_test', 'complete'].includes(marketplacePosStatus)) {
  requireText('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx', 'Seller listings and stock');
  requireText('src/repositories/smePosRepository.ts', 'checkoutMarketplacePos');
  requireText('functions/src/index.ts', 'export const checkoutMarketplacePos');
  requireText('firestore.rules', 'match /smePosSellerLedger/{entryId}');
  requireText('MARKETPLACE_CONSIGNMENT_POS_ALPHA.md', 'mixed-seller checkout');
}
if (marketplacePosStatus === 'complete' && itemById.get('sme.pos_returns_payouts')?.status !== 'complete') fail('Marketplace POS cannot be fully complete before returns and seller payouts are complete.');

const nativeConfirmFiles = [
  'src/features/transactions/TransactionsPage.tsx',
  'src/features/sme-pos/SmePosPage.tsx',
  'src/features/goals/GoalsPage.tsx',
  'src/features/spaces/SharedExpensesPanel.tsx',
  'src/features/spaces/TripMoneyPanel.tsx',
  'src/features/spaces/SpaceFundPanel.tsx',
  'src/features/collaboration/CollaborationPage.tsx',
];
const nativeConfirmOffenders = nativeConfirmFiles.filter((file) => /\b(?:window\.)?(?:confirm|alert)\s*\(/.test(read(file)));
if (itemById.get('safety.native_confirm')?.status === 'complete' && nativeConfirmOffenders.length) {
  fail(`Native browser dialogs remain in: ${nativeConfirmOffenders.join(', ')}`);
}

const release = JSON.parse(read('release.json'));
const packageVersion = JSON.parse(read('package.json')).version;
if (itemById.get('release.version_source')?.status === 'complete') {
  if (packageVersion !== release.version) fail('package.json does not match the canonical release version.');
  requireText('src/pages/SettingsPage.tsx', 'appBuildLabel()');
  requireText('scripts/generate-service-worker.mjs', "new URL('../release.json'");
}

// CI uses the package-level suite so newly registered checks cannot be silently omitted.
const ci = read('.github/workflows/staging-ci.yml');
requireText('.github/workflows/staging-ci.yml', 'npm run verify:all-structural');
requireText('package.json', 'verify-release-safety-hardening.mjs');
requireText('package.json', 'verify-account-data-deletion.mjs');
requireText('package.json', 'verify-recurring-transactions.mjs');
requireText('package.json', 'verify-background-notifications.mjs');
requireText('package.json', 'verify-household-funds-financial-health.mjs');
requireText('package.json', 'verify-offline-sync.mjs');
requireText('package.json', 'verify-transaction-receipts.mjs');
requireText('package.json', 'verify-sme-pos-foundation.mjs');
requireText('package.json', 'verify-standard-pos.mjs');
requireText('package.json', 'verify-marketplace-consignment-pos.mjs');

const counts = audit.items.reduce((result, item) => {
  result[item.status] = (result[item.status] || 0) + 1;
  return result;
}, {});
const blockers = audit.items.filter((item) => item.gate === 'pre_production' && item.status !== 'complete');
const preV1Open = audit.items.filter((item) => ['pre_v1', 'pre_v1_decision'].includes(item.gate) && !['complete', 'deferred'].includes(item.status));

console.log(`Pre-v1 scope audit passed (${audit.items.length} registered requirements).`);
console.log(`Status counts: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ')}.`);
console.log(`Open pre-production blockers: ${blockers.length}. Open pre-v1 items/decisions: ${preV1Open.length}.`);
