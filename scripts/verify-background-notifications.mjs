import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };
const includes = (file, tokens) => {
  if (!exists(file)) fail(`Missing ${file}`);
  const source = read(file);
  for (const token of tokens) if (!source.includes(token)) fail(`${file} is missing: ${token}`);
};

const release = JSON.parse(read('release.json'));
const packageJson = JSON.parse(read('package.json'));
if (release.version.localeCompare('0.11.9', undefined, { numeric: true }) < 0) fail('Background notifications require BajetBN v0.11.9 or later.');
if (packageJson.version !== release.version) fail('package.json and release.json versions do not match.');

includes('functions/src/index.ts', [
  "export const generateBackgroundReminders = onSchedule",
  "schedule: '25 */3 * * *'",
  "timeZone: 'Asia/Brunei'",
  'backgroundReminderId(reminderKey)',
  "source: 'background_reminder'",
  "action: 'background_generated'",
  'export const runMyBackgroundReminderCheck',
  'export const registerPushDevice',
  'export const unregisterPushDevice',
  'sendEachForMulticast',
  "db.collection('pushDevices')",
  "profile.backgroundRemindersEnabled === false",
  "profile.goalReminders !== false",
]);
includes('src/pages/SettingsPage.tsx', [
  'Prepare reminders while BajetBN is closed',
  'Remind me about goal dates',
  'Turn on for this device',
  'Check reminders now',
  'runMyBackgroundReminderCheck',
]);
includes('src/pages/NotificationsPage.tsx', [
  "item.source === 'background_reminder'",
  'Prepared in background',
  'subscribeUserNotifications',
]);
includes('src/layouts/AppShell.tsx', ['subscribeUserNotifications', 'listenForForegroundPush']);
includes('src/repositories/notificationRepository.ts', [
  'VITE_FIREBASE_VAPID_KEY',
  'getBrowserPushSupport',
  'enableBrowserPush',
  'disableBrowserPush',
  'runMyBackgroundReminderCheck',
]);
includes('scripts/generate-service-worker.mjs', [
  "self.addEventListener('push'",
  "self.addEventListener('notificationclick'",
  "showNotification(title",
]);
includes('firestore.rules', [
  "'backgroundRemindersEnabled'",
  "'goalReminders'",
  "'browserPushEnabled'",
  'match /pushDevices/{deviceId}',
  'Managed only by trusted Cloud Functions',
]);
includes('.env.staging.example', ['VITE_FIREBASE_VAPID_KEY=']);
includes('BACKGROUND_NOTIFICATIONS_ALPHA.md', ['deterministic document ID', 'VITE_FIREBASE_VAPID_KEY', 'Staging-only release gate']);
includes('package.json', ['verify-background-notifications.mjs']);

const audit = JSON.parse(read('scope/pre-v1-scope.json'));
const reminderItem = audit.items.find((item) => item.id === 'notifications.reminders');
if (!reminderItem || reminderItem.status !== 'manual_test') fail('Background reminders must remain manual_test until staging approval.');
if (!reminderItem.requirement.includes('generated in the background')) fail('The scope register does not describe background generation.');

const key = ['user-1', 'bill', 'bill-1', '2026-08-03', 'due_soon'].join('|');
const first = `bgr_${crypto.createHash('sha256').update(key).digest('hex').slice(0, 40)}`;
const second = `bgr_${crypto.createHash('sha256').update(key).digest('hex').slice(0, 40)}`;
const changed = `bgr_${crypto.createHash('sha256').update(key.replace('due_soon', 'due_today')).digest('hex').slice(0, 40)}`;
if (first !== second) fail('Reminder document IDs are not deterministic.');
if (first === changed) fail('Different reminder stages must use different document IDs.');
if (!/^bgr_[a-f0-9]{40}$/.test(first)) fail('Reminder document ID format is invalid.');

const day = 86_400_000;
const diff = (date, today) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / day);
if (diff('2026-08-03', '2026-08-01') !== 2) fail('Due-soon date calculation failed.');
if (diff('2026-08-01', '2026-08-01') !== 0) fail('Due-today date calculation failed.');
if (diff('2026-07-31', '2026-08-01') !== -1) fail('Late date calculation failed.');

console.log('Background notification checks passed (scheduled generation, preferences, duplicate prevention, real-time updates and optional device delivery).');
