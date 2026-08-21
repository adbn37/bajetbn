import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let checks = 0;

function fail(message) {
  throw new Error(message);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function need(condition, message) {
  checks += 1;
  if (!condition) fail(message);
}

for (const file of [
  'src/pages/MyInboxPage.tsx',
  'src/repositories/myInboxRepository.ts',
]) {
  need(fs.existsSync(path.join(root, file)), 'Missing My Inbox file: ' + file);
}

const repo = read('src/repositories/myInboxRepository.ts');
const page = read('src/pages/MyInboxPage.tsx');
const app = read('src/app/App.tsx');
const personalisation = read('src/services/personalisation.ts');
const css = read('src/styles/global.css');

for (const marker of [
  "collection(db, 'spaceMembers')",
  "collection(db, 'spaceApprovals')",
  "collection(db, 'sharedBillAssignments')",
  "collection(db, 'userNotifications')",
  'ACTION_NOTIFICATION_TYPES',
  "'space_mention'",
  "'record_mention'",
  "'space_reminder'",
  "'task_assignment'",
  "'contribution_request'",
  "kind: own ? 'approval_request' : 'approval_review'",
  "membership.role === 'owner' || membership.role === 'admin'",
  "assignment.memberUid !== input.uid",
  "targetPath: '/spaces/' + spaceId + '?tab=bills'",
  "approval.targetPath || ('/spaces/' + spaceId + '?tab=approvals')",
]) {
  need(repo.includes(marker), 'My Inbox repository missing: ' + marker);
}

for (const forbidden of [
  'addDoc(',
  'setDoc(',
  'updateDoc(',
  'deleteDoc(',
  'writeBatch(',
  'httpsCallable(',
]) {
  need(!repo.includes(forbidden), 'My Inbox must remain derived/read-only: ' + forbidden);
}

for (const marker of [
  'bajetbn:my-inbox-dismissed:v1',
  'dismissible',
  "filter === 'review'",
  "filter === 'mine'",
  "filter === 'money'",
  'Completing the source record removes the item automatically.',
  'One source of truth.',
]) {
  need(page.includes(marker), 'My Inbox page missing: ' + marker);
}

need(app.includes("const MyInboxPage = lazy("), 'MyInboxPage lazy import missing.');
need(app.includes('<Route path="inbox" element={<MyInboxPage />} />'), 'My Inbox route missing.');
need(personalisation.includes("| 'inbox'"), 'My Inbox navigation ID missing.');
need(personalisation.includes("id: 'inbox'"), 'My Inbox navigation item missing.');
need(personalisation.includes("path: '/inbox'"), 'My Inbox navigation path missing.');
need((personalisation.match(/^\s*inbox:\s*'[^']+',\s*$/gm) || []).length === 3, 'All navigation icon maps must define Inbox.');
need(css.includes('/* v1.7.0 My Inbox */'), 'My Inbox CSS marker missing.');

const shell = read('src/layouts/AppShell.tsx');
const spacesIndex = shell.indexOf('<small>Spaces</small>');
const posIndex = shell.indexOf('<small>POS</small>');
const homeIndex = shell.indexOf('<small>Home</small>');
const alertsIndex = shell.indexOf('<small>Alerts</small>');
const moreIndex = shell.indexOf('<small>More</small>');

need(
  spacesIndex >= 0
    && spacesIndex < posIndex
    && posIndex < homeIndex
    && homeIndex < alertsIndex
    && alertsIndex < moreIndex,
  'Mobile bottom navigation must remain Spaces, POS, Home, Alerts, More.',
);

need(!shell.includes('<small>My Inbox</small>'), 'My Inbox must not replace the fixed mobile bottom navigation.');

console.log('My Inbox verification passed (' + checks + ' structural checks).');
