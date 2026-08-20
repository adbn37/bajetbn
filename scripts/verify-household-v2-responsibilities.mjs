import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const household = read('src/features/spaces/HouseholdCommandCentre.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const collaboration = read('src/features/collaboration/CollaborationPage.tsx');
const repository = read('src/repositories/collaborationRepository.ts');
const styles = read('src/styles/global.css');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  'My household responsibilities',
  'Open payment &amp; proof',
  'pendingReviewCount',
  "assignment.memberUid === currentMember.uid",
  'assignment.assignedMinor',
  'assignment.settledMinor',
  'myOverdueAssignments',
  'myDueSoonAssignments',
  "assignment.status === 'submitted'",
  'Review payments',
]) {
  expect(
    household.includes(token),
    `Household responsibilities UI is missing: ${token}`,
  );
}

expect(
  household.includes("onOpenTab('bills')"),
  'Responsibility actions must reuse Shared Bills.',
);

expect(
  details.includes('currentMember={currentMember || null}'),
  'Current Household member must be passed to command centre.',
);

expect(
  details.includes("currentMember?.role === 'owner'"),
  'Household owner management context is missing.',
);

expect(
  details.includes("currentMember?.role === 'admin'"),
  'Household admin management context is missing.',
);

for (const token of [
  'listSharedBillAssignments',
  'listSharedBillPayments',
  'submitSharedBillPayment',
  'reviewSharedBillPayment',
  'reverseSharedBillPayment',
  'uploadSharedBillProof',
]) {
  expect(
    repository.includes(token),
    `Canonical Shared Bill workflow is missing: ${token}`,
  );
}

expect(
  collaboration.includes('getSharedBillProofUrl'),
  'Shared Bill proof viewing must remain available.',
);

expect(
  styles.includes(
    '/* Household v2 Slice 2 - responsibilities */',
  ),
  'Household responsibilities styles are missing.',
);

expect(
  !household.includes("collection(db, '"),
  'Household Slice 2 must not create parallel Firestore data.',
);

expect(
  !household.includes('window.confirm(')
    && !household.includes('window.alert('),
  'Household Slice 2 must not use browser-native confirmation.',
);

console.log(
  'Household v2 Slice 2 responsibilities checks passed.',
);