import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const need = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(read('package.json'));
const releaseJson = JSON.parse(read('release.json'));
const models = read('src/types/models.ts');
const repo = read('src/repositories/spaceApprovalRepository.ts');
const panel = read('src/features/collaboration/SpaceApprovalsPanel.tsx');
const collaboration = read('src/features/collaboration/CollaborationPage.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const functions = read('functions/src/index.ts');
const rules = read('firestore.rules');
const exporter = read('src/repositories/releaseCandidateRepository.ts');
const css = read('src/styles/global.css');

need(packageJson.version === releaseJson.version, 'Package and release metadata differ.');

for (const token of ['SpaceApprovalStatus', 'SpaceApprovalTargetType', 'SpaceApproval']) {
  need(models.includes(token), 'Missing approval model: ' + token);
}
for (const token of ["'pending'", "'approved'", "'rejected'", "'cancelled'"]) {
  need(models.includes(token), 'Missing approval status: ' + token);
}

need(repo.includes("collection(db, 'spaceApprovals')"), 'Approval repository must subscribe to spaceApprovals.');
need(repo.includes("httpsCallable(functions, 'requestSpaceApproval')"), 'Approval request callable is missing.');
need(repo.includes("httpsCallable(functions, 'reviewSpaceApproval')"), 'Approval review callable is missing.');
need(repo.includes("httpsCallable(functions, 'cancelSpaceApproval')"), 'Approval cancel callable is missing.');
need(!repo.includes('addDoc(') && !repo.includes('updateDoc('), 'Approval writes must stay server-controlled.');

need(panel.includes('Request approval'), 'Approval UI needs one clear request action.');
need(panel.includes('Approve') && panel.includes('Reject'), 'Manager decision controls are missing.');
need(panel.includes('Cancel request'), 'Requester cancellation is missing.');
need(panel.includes('Related record ID') && panel.includes('Related path'), 'Generic record linking fields are missing.');
need(panel.includes('Amount') && panel.includes('Currency'), 'Optional amount/currency snapshot UI is missing.');
need(panel.includes('without duplicating or changing the related financial record'), 'One-source-of-truth guidance is missing.');

need(collaboration.includes("'approvals'"), 'CollaborationTab does not include approvals.');
need(collaboration.includes('<SpaceApprovalsPanel'), 'Space Approvals panel is not mounted.');
need(details.includes("value === 'approvals'"), 'Space Details URL parser does not support approvals.');
need(details.includes("id: 'approvals'"), 'Space Details approvals tab is missing.');

for (const callable of ['requestSpaceApproval', 'reviewSpaceApproval', 'cancelSpaceApproval']) {
  need(functions.includes('export const ' + callable), 'Missing callable: ' + callable);
}
need(functions.includes('requireActiveSpaceMember(spaceId, uid)'), 'Approval requests/cancellation must require active membership.');
need(functions.includes('requireSpaceManager(spaceId, uid)'), 'Approval review must reuse Space manager permissions.');
need(functions.includes("action: 'approval_requested'"), 'Approval request activity is missing.');
need(functions.includes("'approval_approved'"), 'Approval approved activity/notification is missing.');
need(functions.includes("'approval_rejected'"), 'Approval rejected activity/notification is missing.');
need(functions.includes("action: 'approval_cancelled'"), 'Approval cancellation activity is missing.');
need(functions.includes("db.collection('spaceApprovals').doc(commandId(uid, idempotencyKey))"), 'Approval requests need deterministic idempotency.');
need(!functions.includes('approval_auto_post') && !functions.includes('approval_auto_transfer'), 'Approval engine must not automatically move money.');

need(rules.includes('match /spaceApprovals/{approvalId}'), 'Firestore approval rule is missing.');
need(rules.includes('allow create, update, delete: if false;'), 'Approval writes must be callable-only.');
need(functions.includes("queryHasDocuments(db.collection('spaceApprovals').where('spaceId', '==', spaceId))"), 'Space lifecycle does not account for approvals.');
need(functions.includes("collectionName: 'spaceApprovals', field: 'requestedBy'"), 'Requester anonymisation is missing.');
need(functions.includes("collectionName: 'spaceApprovals', field: 'reviewedBy'"), 'Reviewer anonymisation is missing.');

need(exporter.includes("rowsForValues('spaceApprovals', 'spaceId', activeSpaceIds)"), 'Approvals are missing from user export.');
need(exporter.includes('formatVersion: 9'), 'Approval export schema must be format 8.');
need(css.includes('/* v1.7.0 Space approval engine */'), 'Approval CSS marker is missing.');

console.log('v1.7.0 Slice 2 reusable Approval Engine checks passed.');
