import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const models = read('src/types/models.ts');
const repository = read(
  'src/repositories/spaceChatRepository.ts',
);
const panel = read(
  'src/features/collaboration/SpaceChatPanel.tsx',
);
const details = read(
  'src/features/spaces/SpaceDetailsPage.tsx',
);
const rules = read('firestore.rules');
const styles = read('src/styles/global.css');
const packageJson = JSON.parse(read('package.json'));

let checks = 0;

function need(value, message) {
  checks += 1;
  assert.equal(Boolean(value), true, message);
}

need(
  models.includes('export interface SpaceMessage'),
  'SpaceMessage model missing.',
);

for (const token of [
  'subscribeSpaceMessages',
  'sendSpaceMessage',
  "collection(db, 'spaceMessages')",
  "where('spaceId', '==', spaceId)",
  'serverTimestamp()',
  '.slice(-150)',
]) {
  need(
    repository.includes(token),
    `Repository missing: ${token}`,
  );
}

for (const token of [
  'Space chat',
  'Talk with members here without leaving this Space.',
  'No messages yet.',
  'Only active members of this Space can send messages.',
  'maxLength={2000}',
  'Former member',
]) {
  need(
    panel.includes(token),
    `Chat panel missing: ${token}`,
  );
}

need(
  !panel.includes('senderName:'),
  'Chat must not persist a client-supplied sender name.',
);

need(
  !/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(panel),
  'Chat must not use browser confirm/alert.',
);

need(
  details.includes(
    "import { SpaceChatPanel } from '../collaboration/SpaceChatPanel';",
  ),
  'SpaceChatPanel import missing.',
);

need(
  details.includes("{ id: 'chat', label: 'Chat' }")
    && details.includes("value === 'chat'")
    && details.includes("activeTab === 'chat'"),
  'Chat tab wiring missing.',
);

need(
  details.includes('members={members}')
    && details.includes(
      'currentMember={currentMember || null}',
    ),
  'Space members must be provided to Chat.',
);

need(
  rules.includes('match /spaceMessages/{messageId}')
    && rules.includes(
      'request.resource.data.senderUid == request.auth.uid',
    )
    && rules.includes(
      'request.resource.data.createdAt == request.time',
    )
    && rules.includes(
      'request.resource.data.body.size() <= 2000',
    ),
  'Chat security rules incomplete.',
);

need(
  styles.includes(
    '/* Collaboration Chat - realtime Space chat */',
  )
    && styles.includes('.space-chat-message.mine'),
  'Chat styles missing.',
);

need(
  String(packageJson.scripts?.['verify:all-structural'] || '')
    .includes('verify-space-chat.mjs'),
  'Chat verifier not registered.',
);

console.log(
  `Realtime Space Chat checks passed (${checks} checks).`,
);
