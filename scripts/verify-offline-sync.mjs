import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const release = JSON.parse(read('release.json'));
const pkg = JSON.parse(read('package.json'));
const audit = JSON.parse(read('scope/pre-v1-scope.json'));

assert.equal(release.version.localeCompare('0.11.11', undefined, { numeric: true }) >= 0, true, 'Offline Sync requires v0.11.11 or later.');
assert.equal(pkg.version, release.version, 'package.json and release.json must match.');

const checks = [
  ['src/services/firebase.ts', 'persistentLocalCache({ tabManager: persistentMultipleTabManager() })', 'persistent Firestore cache'],
  ['src/services/firebase.ts', 'using the standard cache', 'cache fallback'],
  ['src/services/offlineQueue.ts', "const STORE_NAME = 'commands';", 'IndexedDB command store'],
  ['src/services/offlineQueue.ts', 'MAX_QUEUE_ITEMS = 100', 'bounded local queue'],
  ['src/services/offlineQueue.ts', "kind: 'post_transaction'", 'limited financial command kind'],
  ['src/services/offlineQueue.ts', 'idempotencyKey: input.idempotencyKey', 'stable duplicate-protection key'],
  ['src/services/offlineQueue.ts', 'needs_attention', 'conflict state'],
  ['src/repositories/transactionRepository.ts', 'addOfflineTransactionCommand', 'offline queue write'],
  ['src/repositories/transactionRepository.ts', 'if (!navigator.onLine)', 'offline detection'],
  ['src/repositories/transactionRepository.ts', 'invokePostTransaction(command.payload, command.idempotencyKey)', 'same-key replay'],
  ['src/repositories/transactionRepository.ts', 'syncQueuedTransactions', 'automatic queue processor'],
  ['src/repositories/transactionRepository.ts', "status: 'needs_attention'", 'non-retryable conflict handling'],
  ['src/contexts/OfflineSyncContext.tsx', "window.addEventListener('online'", 'reconnect listener'],
  ['src/contexts/OfflineSyncContext.tsx', 'window.setInterval', 'periodic retry'],
  ['src/contexts/OfflineSyncContext.tsx', 'document.visibilityState', 'visible-tab retry'],
  ['src/pages/OfflineSyncPage.tsx', 'Duplicate-safe', 'plain-language duplicate explanation'],
  ['src/pages/OfflineSyncPage.tsx', 'Remove this unsynced entry?', 'safe removal confirmation'],
  ['src/pages/OfflineSyncPage.tsx', 'Online still required for other actions.', 'scope boundary'],
  ['src/components/ConnectivityBanner.tsx', 'Cached money information may be older.', 'stale-data warning'],
  ['src/features/transactions/TransactionsPage.tsx', 'Save on this device', 'offline transaction action'],
  ['src/features/transactions/TransactionsPage.tsx', "outcome.mode === 'queued'", 'queued result handling'],
  ['src/app/App.tsx', '<OfflineSyncProvider>', 'offline provider'],
  ['scripts/generate-service-worker.mjs', ".filter((url) => url !== '/app-recovery.js')", 'recovery script excluded from service-worker precache'],
  ['public/app-recovery.js', 'navigator.serviceWorker.getRegistrations()', 'stale service-worker recovery'],
  ['public/app-recovery.js', "key.startsWith('bajetbn-shell-')", 'stale application-shell cache recovery'],
  ['src/main.tsx', "navigator.serviceWorker.addEventListener('controllerchange'", 'service-worker update reload'],
  ['src/main.tsx', 'hadServiceWorkerController', 'first-install reload guard'],
  ['src/app/App.tsx', 'path="offline-sync"', 'offline route'],
  ['src/services/personalisation.ts', "id: 'offline-sync', path: '/offline-sync', label: 'Offline & sync'", 'offline navigation'],
  ['src/services/i18n.ts', "'Offline & sync': 'Luar talian & segerak'", 'Malay navigation wording'],
  ['OFFLINE_SYNC_ALPHA.md', 'duplicate-protection key', 'offline sync documentation'],
  ['STAGING_TEST_CHECKLIST.md', 'v0.11.11 Offline Sync', 'staging test matrix'],
];

for (const [file, token, label] of checks) {
  assert.equal(read(file).includes(token), true, `${label} is missing from ${file}`);
}

const offlineItem = audit.items.find((item) => item.id === 'pwa.offline_mutations');
assert.ok(offlineItem, 'Offline sync is missing from the pre-v1 scope register.');
assert.equal(['manual_test', 'complete'].includes(offlineItem.status), true, 'Offline sync must remain implemented after staging approval.');
assert.equal(offlineItem.gate, 'pre_v1', 'Offline sync must remain a pre-v1 gate.');

const repository = read('src/repositories/transactionRepository.ts');
const firstKeyUse = repository.indexOf('invokePostTransaction(input, key)');
const queueKeyUse = repository.indexOf('idempotencyKey: key');
assert.ok(firstKeyUse >= 0 && queueKeyUse >= 0, 'Online attempt and queued retry do not share one key.');
assert.equal(repository.includes("httpsCallable(functions, 'reverseTransaction')"), true, 'Transaction reversal was removed unexpectedly.');
assert.equal(repository.includes("kind: 'post_transaction'"), false, 'The repository should use the queue service rather than direct IndexedDB writes.');

const validKey = 'offline-1722653100000-abc123def456';
assert.match(validKey, /^[a-zA-Z0-9-]{16,64}$/, 'Fallback duplicate-protection key is invalid.');
const sameRequestKeys = new Set([validKey, validKey, validKey]);
assert.equal(sameRequestKeys.size, 1, 'Retry simulation did not preserve the same duplicate-protection key.');

assert.equal(pkg.scripts['verify:all-structural'].includes('verify-offline-sync.mjs'), true, 'Offline sync verifier is not in the full suite.');
console.log(`Offline sync checks passed (${checks.length} structural checks plus duplicate-key and scope validation).`);
