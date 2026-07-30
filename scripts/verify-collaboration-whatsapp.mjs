import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['src/app/App.tsx', 'path="sharing"'],
  ['src/app/App.tsx', 'path="join"'],
  ['src/layouts/AppShell.tsx', "'/sharing', 'Sharing'"],
  ['src/types/models.ts', 'SpaceInvitation'],
  ['src/types/models.ts', 'SharedBillAssignment'],
  ['src/types/models.ts', 'SpaceApprovalMode'],
  ['src/repositories/collaborationRepository.ts', 'createSpaceInvitation'],
  ['src/repositories/collaborationRepository.ts', 'uploadSharedBillProof'],
  ['src/features/collaboration/CollaborationPage.tsx', 'Notify head on WhatsApp'],
  ['src/features/collaboration/CollaborationPage.tsx', 'Automatic confirmation'],
  ['src/features/collaboration/JoinSpacePage.tsx', 'Accept invitation'],
  ['functions/src/index.ts', 'export const createSpaceInvitation'],
  ['functions/src/index.ts', 'export const acceptSpaceInvitation'],
  ['functions/src/index.ts', 'export const updateSpaceMember'],
  ['functions/src/index.ts', 'export const removeSpaceMember'],
  ['functions/src/index.ts', 'export const createSharedBillAssignment'],
  ['functions/src/index.ts', 'export const submitSharedBillPayment'],
  ['functions/src/index.ts', 'export const reviewSharedBillPayment'],
  ['firestore.rules', 'match /sharedBillAssignments/{assignmentId}'],
  ['firestore.rules', 'match /userNotifications/{notificationId}'],
  ['storage.rules', 'payment-proofs'],
  ['storage.rules', 'isActiveSpaceMember'],
];

for (const [file, marker] of checks) {
  const content = read(file);
  if (!content.includes(marker)) throw new Error(`${file} is missing: ${marker}`);
}

const roleText = read('functions/src/index.ts');
for (const role of ['admin', 'contributor', 'payer', 'viewer']) {
  if (!roleText.includes(`'${role}'`)) throw new Error(`Missing collaboration role: ${role}`);
}

console.log(`Collaboration and WhatsApp checks passed (${checks.length} structural checks).`);
