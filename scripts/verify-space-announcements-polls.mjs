import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const need = (condition, message) => {
  if (!condition) throw new Error(message);
};

const packageJson = JSON.parse(read('package.json'));
const releaseJson = JSON.parse(read('release.json'));
const models = read('src/types/models.ts');
const repo = read('src/repositories/spaceCollaborationActionsRepository.ts');
const panel = read('src/features/collaboration/SpaceUpdatesPanel.tsx');
const collaboration = read('src/features/collaboration/CollaborationPage.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const functions = read('functions/src/index.ts');
const rules = read('firestore.rules');
const exporter = read('src/repositories/releaseCandidateRepository.ts');
const css = read('src/styles/global.css');

need(
  packageJson.version === releaseJson.version,
  'Package and release metadata differ.',
);
need(
  packageJson.version.localeCompare('1.6.0', undefined, {
    numeric: true,
    sensitivity: 'base',
  }) >= 0,
  'Announcements and polls require v1.6.0 or newer.',
);

for (const token of [
  'SpaceAnnouncement',
  'SpacePollOption',
  'SpacePoll',
  'SpacePollVote',
]) {
  need(models.includes(token), 'Missing collaboration model: ' + token);
}

for (const token of [
  'spaceAnnouncements',
  'spacePolls',
  'spacePollVotes',
  'createSpaceAnnouncement',
  'createSpacePoll',
  'voteSpacePoll',
  'setSpacePollStatus',
]) {
  need(repo.includes(token), 'Collaboration repository missing: ' + token);
}

need(
  !repo.includes('addDoc(') && !repo.includes('updateDoc('),
  'Announcement and poll writes must remain server-controlled.',
);

need(panel.includes('Add update'), 'Space Updates needs one primary composer action.');
need(
  panel.includes('Announcement') && panel.includes('Poll'),
  'Combined update composer is missing.',
);
need(
  panel.includes('Only the Space owner or manager'),
  'Role-aware management guidance is missing.',
);
need(panel.includes('You voted'), 'Member poll vote state is missing.');
need(
  panel.includes('Close poll') && panel.includes('Reopen poll'),
  'Poll lifecycle controls are missing.',
);
need(panel.includes('Archive'), 'Announcement archival is missing.');

need(
  collaboration.includes("'updates'"),
  'CollaborationTab does not include Updates.',
);
need(
  collaboration.includes('<SpaceUpdatesPanel'),
  'Space Updates panel is not mounted in CollaborationPage.',
);
need(
  details.includes("id: 'updates'"),
  'Space Details does not expose the Updates tab.',
);
need(
  details.includes("value === 'updates'"),
  'Space Details URL tab parsing does not support Updates.',
);

for (const callable of [
  'createSpaceAnnouncement',
  'setSpaceAnnouncementState',
  'createSpacePoll',
  'voteSpacePoll',
  'setSpacePollStatus',
]) {
  need(
    functions.includes('export const ' + callable),
    'Missing callable: ' + callable,
  );
}

need(
  functions.includes('requireSpaceManager(spaceId, uid)'),
  'Announcement/poll management must reuse Space manager permissions.',
);
need(
  functions.includes('requireActiveSpaceMember(spaceId, uid)'),
  'Poll voting must require active Space membership.',
);
need(
  functions.includes("action: 'announcement_created'"),
  'Announcement creation must write Space activity.',
);
need(
  functions.includes("action: 'poll_created'"),
  'Poll creation must write Space activity.',
);
need(
  functions.includes(
    "db.collection('spacePollVotes').doc(commandId(uid, pollId))",
  ),
  'One deterministic vote document per member is missing.',
);
need(
  functions.includes('labels.length < 2 || labels.length > 8'),
  'Poll option limits are missing.',
);

for (const collectionName of [
  'spaceAnnouncements',
  'spacePolls',
  'spacePollVotes',
]) {
  need(
    rules.includes('match /' + collectionName + '/{'),
    'Missing Firestore rule for ' + collectionName,
  );
  need(
    functions.includes(
      "db.collection('" +
        collectionName +
        "').where('spaceId', '==', spaceId)",
    ),
    'Space lifecycle does not account for ' + collectionName,
  );
}

need(
  rules.includes('allow create, update, delete: if false;'),
  'Server-controlled collaboration rules are missing.',
);

need(
  functions.includes(
    "collectionName: 'spaceAnnouncements', field: 'createdBy'",
  ),
  'Announcement authors are not covered by account-deletion anonymisation.',
);
need(
  functions.includes("collectionName: 'spacePolls', field: 'createdBy'"),
  'Poll authors are not covered by account-deletion anonymisation.',
);
need(
  functions.includes("collectionName: 'spacePollVotes', field: 'uid'"),
  'Poll voters are not covered by account-deletion anonymisation.',
);

need(
  exporter.includes("rowsForValues('spaceAnnouncements'"),
  'Announcements are missing from user data export.',
);
need(
  exporter.includes("rowsForValues('spacePolls'"),
  'Polls are missing from user data export.',
);
need(
  exporter.includes("rowsForValues('spacePollVotes'"),
  'Poll votes are missing from user data export.',
);
need(
  exporter.includes(
    'allSpacePollVotes.filter((item) => item.uid === uid)',
  ),
  'User export must include only the signed-in user poll vote identities.',
);

need(
  css.includes('/* v1.7.0 Space announcements and polls */'),
  'Slice 1 CSS marker missing.',
);
need(
  css.includes('.space-poll-option.selected'),
  'Selected vote styling missing.',
);

console.log('v1.7.0 Slice 1 Announcements + Polls checks passed.');
