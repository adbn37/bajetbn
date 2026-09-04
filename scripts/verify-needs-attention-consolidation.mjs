import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');
let checks = 0;

function need(value, message) {
  checks += 1;
  assert.equal(Boolean(value), true, message);
}

const functions = read('functions/src/index.ts');
const repo = read('src/repositories/myInboxRepository.ts');
const page = read('src/pages/MyInboxPage.tsx');
const personalisation = read('src/services/personalisation.ts');
const app = read('src/app/App.tsx');
const styles = read('src/styles/global.css');
const packageJson = JSON.parse(read('package.json'));

for (const token of [
  'title="Needs Attention"',
  'Cross-Space action queue',
  "filter === 'action'",
  "filter === 'waiting'",
  "filter === 'money'",
  'Completing the source record removes the item automatically.',
  'One source of truth.',
  'It never posts a transfer, expense or seller payout for you.',
]) {
  need(page.includes(token), 'Needs Attention page missing: ' + token);
}

need(
  personalisation.includes(
    "{ id: 'inbox', path: '/inbox', label: 'Attention', icon: '✓' },",
  ),
  'Navigation must expose one Attention destination on the existing inbox route.',
);
need(app.includes('<Route path="inbox" element={<MyInboxPage />} />'), 'Existing /inbox route must be preserved.');
need(!app.includes('path="needs-attention"'), 'Do not create a second Needs Attention route/dashboard.');

for (const token of [
  'automationRule?: string | null;',
  'function automationRule(',
  'assignedBillKeys',
  "rule === 'overdue_bill'",
  "assignedBillKeys.has(spaceId + ':' + notification.itemId)",
  'automationRule: rule || null',
]) {
  need(repo.includes(token), 'Needs Attention repository missing: ' + token);
}

for (const forbidden of [
  'addDoc(',
  'setDoc(',
  'updateDoc(',
  'deleteDoc(',
  'writeBatch(',
  'httpsCallable(',
]) {
  need(!repo.includes(forbidden), 'Derived Needs Attention repository must stay read-only: ' + forbidden);
}

for (const token of [
  'function spaceAutomationReminderKey(',
  'async function cleanupResolvedSpaceAutomationReminders(',
  "item.type === 'space_reminder'",
  "item.source === 'background_reminder'",
  "reminderKey.includes('|space_automation|')",
  'activeReminderKeys.add(spaceAutomationReminderKey(uid, candidate))',
  'await cleanupResolvedSpaceAutomationReminders(',
]) {
  need(functions.includes(token), 'Reminder lifecycle hardening missing: ' + token);
}

const cleanupStart = functions.indexOf('async function cleanupResolvedSpaceAutomationReminders(');
const cleanupEnd = functions.indexOf('async function createSpaceAutomationReminder(', cleanupStart);
need(cleanupStart >= 0 && cleanupEnd > cleanupStart, 'Cleanup helper boundary missing.');
const cleanup = functions.slice(cleanupStart, cleanupEnd);
need(cleanup.includes("collection('userNotifications')"), 'Cleanup may only target existing userNotifications.');

for (const forbidden of [
  "collection('transactions')",
  "collection('ledgerEntries')",
  "collection('sharedExpensePayments')",
  "collection('commitmentPayments')",
  "collection('smePosPayouts')",
  'recordMarketplaceSellerPayout',
  'recordSpaceFundContribution',
  'postTransaction',
]) {
  need(!cleanup.includes(forbidden), 'Lifecycle cleanup must not touch financial records: ' + forbidden);
}

need(!functions.includes('export const generateSpaceAutomationReminders = onSchedule'), 'No second reminder scheduler is allowed.');
need(!functions.includes("collection('needsAttention')"), 'No Needs Attention collection is allowed.');
need(!repo.includes("'needsAttention'"), 'No client Needs Attention collection is allowed.');
need(styles.includes('/* v1.7.0 Needs Attention consolidation */'), 'Needs Attention styles missing.');
need(String(packageJson.scripts?.['verify:all-structural'] || '').includes('verify-needs-attention-consolidation.mjs'), 'Slice 6 verifier not registered.');

console.log('Needs Attention consolidation checks passed (' + checks + ' checks).');
