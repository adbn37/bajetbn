import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const models = read('src/types/models.ts');
const repository = read('src/repositories/spaceChatRepository.ts');
const recordRepository = read('src/repositories/spaceChatRecordRepository.ts');
const panel = read('src/features/collaboration/SpaceChatPanel.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const rules = read('firestore.rules');
const storage = read('storage.rules');
const functions = read('functions/src/index.ts');
const exportSource = read('src/repositories/releaseCandidateRepository.ts');
const inbox = read('src/repositories/myInboxRepository.ts');
const styles = read('src/styles/global.css');
const packageJson = JSON.parse(read('package.json'));

let checks = 0;

function need(value, message) {
  checks += 1;
  assert.equal(Boolean(value), true, message);
}

for (const token of [
  'export type SpaceChatRecordType',
  'export interface SpaceChatRecordRef',
  'export interface SpaceMessageReply',
  'mentionLabels?: string[]',
  'recordRef?: SpaceChatRecordRef | null',
  'replyTo?: SpaceMessageReply | null',
  'storagePath?: string | null',
]) {
  need(models.includes(token), 'Chat v2 model missing: ' + token);
}

for (const token of [
  'subscribeSpaceMessages',
  'sendSpaceMessage',
  "'sendSpaceChatMessage'",
  'httpsCallable',
  'uploadSpaceChatAttachment',
  'getSpaceChatAttachmentUrl',
  'removeSpaceChatAttachment',
  'uploadBytes',
  'deleteObject',
]) {
  need(repository.includes(token), 'Chat v2 repository missing: ' + token);
}

for (const token of [
  'listSpaceChatRecordOptions',
  'spaceChatDiscussionPath',
  "collectionName: 'sharedExpenses'",
  "collectionName: 'sharedBillAssignments'",
  "collectionName: 'tripTasks'",
  "collectionName: 'tripBookings'",
  "collectionName: 'smePosPayouts'",
  "collectionName: 'collectionItems'",
  "collectionName: 'spaceApprovals'",
]) {
  need(recordRepository.includes(token), 'Record picker missing: ' + token);
}

for (const token of [
  '@ Mention member',
  '@ Reference record',
  'Mention member',
  'Reference record',
  'Attach image or PDF',
  'Reply',
  "searchParams.get('messageId')",
  "searchParams.get('recordType')",
  "searchParams.get('recordId')",
  'Open record',
  'SpaceChatAttachment',
]) {
  need(panel.includes(token), 'Chat v2 panel missing: ' + token);
}

need(
  details.includes(
    "import { SpaceChatPanel } from '../collaboration/SpaceChatPanel';",
  )
    && details.includes("{ id: 'chat', label: 'Chat' }")
    && details.includes("activeTab === 'chat'"),
  'Existing Space Chat tab wiring must remain intact.',
);

for (const token of [
  'export const sendSpaceChatMessage = onCall',
  "type: recordRef ? 'record_mention' : 'space_mention'",
  "kind: 'send_space_chat_message'",
  "queryHasDocuments(db.collection('spaceMessages').where('spaceId', '==', spaceId))",
  "collectionName: 'spaceMessages', field: 'senderUid'",
]) {
  need(functions.includes(token), 'Chat v2 Functions integration missing: ' + token);
}

need(
  storage.includes(
    'match /spaces/{spaceId}/chat-attachments/{uid}/{attachmentId}/{fileName}',
  )
    && storage.includes('request.auth.uid == uid')
    && storage.includes('isImageOrPdf()')
    && storage.includes('underTenMb()'),
  'Chat attachment Storage rules are incomplete.',
);

need(
  rules.includes('match /spaceMessages/{messageId}')
    && rules.includes('request.resource.data.senderUid == request.auth.uid'),
  'Existing backwards-compatible basic Chat rule must remain.',
);

need(
  inbox.includes("'space_mention'")
    && inbox.includes("'record_mention'"),
  'My Inbox mention hooks are missing.',
);

need(
  exportSource.includes(
    "rowsForValues('spaceMessages', 'spaceId', activeSpaceIds)",
  )
    && exportSource.includes('    spaceMessages,')
    && exportSource.includes('formatVersion: 9,'),
  'Chat export integration or format version 9 is missing.',
);

need(
  styles.includes(
    '/* Collaboration Chat v2 - mentions, records, replies and attachments */',
  )
    && styles.includes('.space-chat-record-card')
    && styles.includes('.space-chat-picker'),
  'Chat v2 styles are missing.',
);

need(
  !repository.includes("collection(db, 'spaceComments')")
    && !recordRepository.includes("'spaceComments'")
    && !functions.includes("collection('spaceComments')"),
  'Chat v2 must not create a duplicate comments database.',
);

need(
  String(packageJson.scripts?.['verify:all-structural'] || '')
    .includes('verify-space-chat.mjs'),
  'Chat verifier is not registered.',
);

console.log(
  'Chat v2 mentions and record discussion checks passed ('
  + checks
  + ' checks).',
);
