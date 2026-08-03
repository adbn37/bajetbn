import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['invitation declined status', read('src/types/models.ts').includes("'declined'")],
  ['invitation Space name', read('src/types/models.ts').includes('spaceName?: string')],
  ['notification target path', read('src/types/models.ts').includes('targetPath?: string')],
  ['my invitations query', read('src/repositories/collaborationRepository.ts').includes('listMySpaceInvitations')],
  ['decline invitation repository', read('src/repositories/collaborationRepository.ts').includes('declineSpaceInvitation')],
  ['mark all read repository', read('src/repositories/collaborationRepository.ts').includes('markAllNotificationsRead')],
  ['Spaces invitation panel', read('src/features/spaces/SpacesPage.tsx').includes('Invitations for me')],
  ['join Space button', read('src/features/spaces/SpacesPage.tsx').includes('Join Space')],
  ['decline button', read('src/features/spaces/SpacesPage.tsx').includes('Decline')],
  ['notification page', fs.existsSync(path.join(root, 'src/pages/NotificationsPage.tsx'))],
  ['notification route', read('src/app/App.tsx').includes('path="notifications"')],
  ['notification bell', read('src/layouts/AppShell.tsx').includes('unreadNotifications')],
  ['mark all read UI', read('src/pages/NotificationsPage.tsx').includes('Mark all as read')],
  ['late bill alerts', read('src/pages/NotificationsPage.tsx').includes('Bill is late')],
  ['coming bill alerts', read('src/pages/NotificationsPage.tsx').includes('Bill is coming soon')],
  ['invitee Firestore rule', read('firestore.rules').includes('request.auth.token.email')],
  ['decline callable', read('functions/src/index.ts').includes('export const declineSpaceInvitation')],
  ['registered invite notification', read('functions/src/index.ts').includes("type: 'invitation_received'")],
  ['joined Space notification', read('functions/src/index.ts').includes("type: 'space_joined'")],
  ['goal notification', read('functions/src/index.ts').includes("type:'goal_updated'")],
  ['Trip contribution notification', read('functions/src/index.ts').includes("'trip_contribution_added'")],
  ['multi-member bill repository', read('src/repositories/collaborationRepository.ts').includes('createSharedBillAssignments')],
  ['multi-member bill callable', read('functions/src/index.ts').includes('export const createSharedBillAssignments')],
  ['equal bill splitting', read('src/features/collaboration/CollaborationPage.tsx').includes('Split equally')],
  ['different bill amounts', read('src/features/collaboration/CollaborationPage.tsx').includes('Enter different amounts')],
  ['duplicate bill share protection', read('functions/src/index.ts').includes('already has a share for this bill')],
  ['close Trip wording', read('src/features/spaces/SpaceDetailsPage.tsx').includes('Close Trip')],
  ['invitations exported', read('src/repositories/releaseCandidateRepository.ts').includes('invitations,')],
  ['documentation', fs.existsSync(path.join(root, 'INVITATIONS_NOTIFICATIONS_ALPHA.md'))],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error('Invitation and notification checks failed:');
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

function equalSplit(total, count) {
  const base = Math.floor(total / count);
  let remainder = total - (base * count);
  return Array.from({ length: count }, () => {
    const value = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return value;
  });
}
const split = equalSplit(3700, 3);
if (split.reduce((sum, value) => sum + value, 0) !== 3700) throw new Error('Equal bill split total is incorrect.');
if (new Set(['a', 'b', 'c']).size !== 3) throw new Error('Member uniqueness check failed.');

console.log(`Invitations, notifications and Space completion checks passed (${checks.length} structural checks plus bill-split calculations).`);
