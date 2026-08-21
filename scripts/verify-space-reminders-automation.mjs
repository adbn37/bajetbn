import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');

const models = read('src/types/models.ts');
const repository = read('src/repositories/spaceAutomationRepository.ts');
const panel = read('src/features/collaboration/SpaceReminderAutomationPanel.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const functions = read('functions/src/index.ts');
const rules = read('firestore.rules');
const inbox = read('src/repositories/myInboxRepository.ts');
const exportSource = read('src/repositories/releaseCandidateRepository.ts');
const styles = read('src/styles/global.css');
const packageJson = JSON.parse(read('package.json'));

let checks = 0;

function need(value, message) {
  checks += 1;
  assert.equal(Boolean(value), true, message);
}

for (const token of [
  'export interface SpaceAutomationPreference',
  'export type SpaceAutomationPreferenceMap',
  'spaceAutomationV1?: SpaceAutomationPreferenceMap',
  'contributionDueDate?: string | null',
  'budgetThresholdPercent: number',
  'lowFundThresholdMinor: number',
  'lowStockThreshold: number',
  'sellerPayoutThresholdMinor: number',
]) {
  need(models.includes(token), 'Space automation model missing: ' + token);
}

for (const token of [
  'defaultSpaceAutomationPreference',
  'getSpaceAutomationPreference',
  'saveSpaceAutomationPreference',
  'runMySpaceAutomationCheck',
  "'runMyBackgroundReminderCheck'",
  'spaceAutomationV1: map',
]) {
  need(repository.includes(token), 'Space automation repository missing: ' + token);
}

for (const token of [
  'Reminders & automation',
  'Enable reminders for this Space',
  'Contribution due reminder',
  'Overdue shared bills',
  'Overdue assigned tasks',
  'Budget threshold',
  'Low Trip / Household Fund',
  'Low stock',
  'Seller payout due',
  'No silent money actions',
  'Save reminder rules',
  'Check saved rules now',
]) {
  need(panel.includes(token), 'Space reminder panel missing: ' + token);
}

need(
  details.includes(
    "import { SpaceReminderAutomationPanel } from '../collaboration/SpaceReminderAutomationPanel';",
  )
    && details.includes('<SpaceReminderAutomationPanel')
    && details.includes("currentMember.status || 'active'"),
  'Space reminder settings must be mounted for active Space members.',
);

for (const token of [
  'interface SpaceAutomationPreferenceData',
  'enabledSpaceAutomationPreferences',
  'createSpaceAutomationReminder',
  'processSpaceAutomationRemindersForUser',
  "type: 'space_reminder'",
  "source: 'background_reminder'",
  "collection('sharedBillAssignments').where('memberUid', '==', uid)",
  "collection('tripTasks').where('assigneeUid', '==', uid)",
  "collection('budgets')",
  "collection('spaceFunds').doc(spaceId)",
  "collection('smePosProducts')",
  "collection('smePosSellers')",
  'budget_threshold',
  'low_fund',
  'low_stock',
  'seller_payout_due',
  'const automationResult = await processSpaceAutomationRemindersForUser(',
  'result.pushSent += automationResult.pushSent',
  'sendBrowserPush(uid, created)',
]) {
  need(functions.includes(token), 'Space automation Functions missing: ' + token);
}

const helperStart = functions.indexOf('interface SpaceAutomationPreferenceData');
const helperEnd = functions.indexOf('async function processBackgroundRemindersForUser(');
need(helperStart >= 0 && helperEnd > helperStart, 'Space automation helper boundary missing.');

const helper = functions.slice(helperStart, helperEnd);

for (const forbidden of [
  "collection('transactions')",
  "collection('ledgerEntries')",
  "collection('commitmentPayments')",
  'transaction.update(',
  'transaction.set(',
  'recordMarketplaceSellerPayout',
  'recordSpaceFundContribution',
  'postTransaction',
]) {
  need(
    !helper.includes(forbidden),
    'Reminder automation must not mutate financial records: ' + forbidden,
  );
}

need(
  !functions.includes('export const generateSpaceAutomationReminders = onSchedule'),
  'Slice 5 must extend the existing reminder scheduler, not create a second scheduler.',
);

need(
  rules.includes("'themeStudioV2', 'spaceAutomationV1', 'updatedAt'")
    && rules.includes("request.resource.data.spaceAutomationV1 is map"),
  'User profile update whitelist must allow personal Space automation settings.',
);

need(
  inbox.includes("'space_reminder'"),
  'My Inbox must retain the space_reminder action hook.',
);

need(
  exportSource.includes('formatVersion: 9,'),
  'Slice 5 must keep export format 9 because preferences already travel inside the exported user profile.',
);

need(
  !functions.includes("collection('spaceAutomationPreferences')")
    && !repository.includes("'spaceAutomationPreferences'"),
  'Slice 5 must not create a parallel automation preference collection.',
);

need(
  styles.includes('/* v1.7.0 Space reminders and automation */'),
  'Space reminder styles are missing.',
);

need(
  String(packageJson.scripts?.['verify:all-structural'] || '')
    .includes('verify-space-reminders-automation.mjs'),
  'Slice 5 verifier is not registered.',
);

console.log(
  'Space reminders and automation checks passed ('
  + checks
  + ' checks).',
);
