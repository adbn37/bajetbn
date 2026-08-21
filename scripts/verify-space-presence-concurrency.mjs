import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const models = read('src/types/models.ts');
const presenceRepository = read(
  'src/repositories/spacePresenceRepository.ts',
);
const presenceHook = read(
  'src/features/collaboration/useSpacePresence.ts',
);
const chat = read(
  'src/features/collaboration/SpaceChatPanel.tsx',
);
const details = read(
  'src/features/spaces/SpaceDetailsPage.tsx',
);
const rules = read('firestore.rules');
const functions = read('functions/src/index.ts');
const packageJson = JSON.parse(read('package.json'));

let checks = 0;

function need(value, message) {
  checks += 1;
  assert.equal(Boolean(value), true, message);
}

for (const token of [
  'export interface SpacePresence',
  'spaceId: string;',
  'uid: string;',
  'activeAt?: Timestamp;',
  'expiresAt?: Timestamp;',
  'typingUntil?: Timestamp | null;',
]) {
  need(models.includes(token), `Presence model missing: ${token}`);
}

for (const token of [
  "collection(db, 'spacePresence')",
  "doc(db, 'spacePresence', presenceId(spaceId, uid))",
  "where('spaceId', '==', spaceId)",
  'SPACE_PRESENCE_HEARTBEAT_MS = 30_000',
  'SPACE_PRESENCE_TTL_MS = 90_000',
  'SPACE_PRESENCE_REFRESH_MS = 2_000',
  'SPACE_TYPING_TTL_MS = 8_000',
  'serverTimestamp()',
  'Timestamp.fromMillis',
  '.filter((item) => isPresenceActive(item, now))',
  'setSpaceTyping',
]) {
  need(
    presenceRepository.includes(token),
    `Presence repository missing: ${token}`,
  );
}

for (const token of [
  'document.visibilityState',
  'window.setInterval',
  'visibilitychange',
  "window.addEventListener('focus', touch)",
  'Presence is optional.',
]) {
  need(
    presenceHook.includes(token),
    `Presence heartbeat missing: ${token}`,
  );
}

need(
  !presenceHook.includes('spaceActivities')
    && !presenceHook.includes('userNotifications')
    && !presenceRepository.includes('spaceActivities')
    && !presenceRepository.includes('userNotifications'),
  'Presence must not create activity or notification history.',
);

for (const token of [
  "import { useSpacePresenceHeartbeat } from '../collaboration/useSpacePresence';",
  'useSpacePresenceHeartbeat({',
  "space.type !== 'personal'",
  "&& !space.archivedAt",
]) {
  need(
    details.includes(token),
    `Space-wide presence wiring missing: ${token}`,
  );
}

for (const token of [
  'subscribeSpacePresence',
  'setSpaceTyping',
  'typingWriteAtRef',
  'updateMessageDraft',
  'activePresenceNames',
  'typingPresenceNames',
  'active now',
  'Active now:',
  'typing...',
]) {
  need(chat.includes(token), `Chat presence UI missing: ${token}`);
}

for (const token of [
  'match /spacePresence/{presenceId}',
  'presenceId == membershipId(request.resource.data.spaceId, request.auth.uid)',
  'request.resource.data.uid == request.auth.uid',
  'request.resource.data.activeAt == request.time',
  "request.resource.data.expiresAt <= request.time + duration.value(2, 'm')",
  "request.resource.data.typingUntil <= request.time + duration.value(15, 's')",
  'resource.data.uid == request.auth.uid',
]) {
  need(rules.includes(token), `Presence rules missing: ${token}`);
}

need(
  rules.includes('match /spaceAnnouncements/{announcementId}')
    && rules.includes('match /spacePolls/{pollId}')
    && rules.includes('match /spacePollVotes/{voteId}')
    && rules.includes('match /spaceApprovals/{approvalId}'),
  'Server-owned collaboration rule boundaries changed unexpectedly.',
);

for (const token of [
  ".collection('collaborationCommands')",
  'return db.runTransaction(async (transaction) => {',
  "const voteRef = db.collection('spacePollVotes').doc(commandId(uid, pollId));",
  "if (current.status === decision) return { approvalId: ref.id, status: current.status };",
]) {
  need(
    functions.includes(token),
    `Concurrency safeguard missing: ${token}`,
  );
}

need(
  !presenceRepository.includes("collection(db, 'transactions')")
    && !presenceRepository.includes("collection(db, 'ledgerEntries')")
    && !presenceRepository.includes('recordMarketplaceSellerPayout')
    && !presenceRepository.includes('recordSpaceFundContribution'),
  'Presence must not touch financial records.',
);

need(
  String(packageJson.scripts?.['verify:all-structural'] || '')
    .includes('verify-space-presence-concurrency.mjs'),
  'Slice 7 verifier is not registered in verify:all-structural.',
);

console.log(
  `Space presence and concurrency checks passed (${checks} checks).`,
);