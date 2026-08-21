import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const centre = read('src/features/spaces/HouseholdCommandCentre.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const fund = read('src/features/spaces/SpaceFundPanel.tsx');
const models = read('src/types/models.ts');
const styles = read('src/styles/global.css');

const checks = [];

function need(condition, label) {
  checks.push(label);
  if (!condition) throw new Error(label);
}

for (const token of [
  'Household at a glance',
  'Needs Attention',
  'Household Fund',
  'Bills & responsibilities',
  'Shared Bills',
  'Settlements',
  'getSpaceFund',
  'fund?.availableMinor',
  'fund?.contributedMinor',
  'fund?.budgetMinor',
  "item.status === 'active'",
  "item.status !== 'paid'",
]) {
  need(
    centre.includes(token),
    `Household Command Centre is missing: ${token}`,
  );
}

need(
  centre.includes("onOpenTab('group_fund')"),
  'Household Fund action must reuse the existing Space Fund tab.',
);

need(
  centre.includes("onOpenTab('bills')"),
  'Shared Bill action must reuse the existing bills tab.',
);

need(
  centre.includes("onOpenTab('balances')"),
  'Settlement action must reuse the existing balances tab.',
);

need(
  !centre.includes('window.confirm(') && !centre.includes('window.alert('),
  'Household Command Centre must not use browser-native confirmation.',
);

need(
  details.includes(
    "import { HouseholdCommandCentre } from './HouseholdCommandCentre';",
  ),
  'SpaceDetailsPage must import HouseholdCommandCentre.',
);

need(
  details.includes(
    "activeTab === 'overview' && space.type === 'household'",
  ),
  'Household Command Centre must render only on Household overview.',
);

for (const prop of [
  'members={members}',
  'commitments={commitments}',
  'sharedBills={sharedBills}',
  'sharedExpenses={sharedExpenses}',
  'onOpenTab={chooseTab}',
]) {
  need(
    details.includes(prop),
    `Household Command Centre must reuse existing Space data: ${prop}`,
  );
}

need(
  details.includes("space.type === 'household' || space.type === 'project' || space.type === 'event' || space.type === 'custom'"),
  'Existing Household Fund capability must remain enabled.',
);

need(
  fund.includes('fund?.holderUid') || fund.includes('fund.holderUid'),
  'Existing Space Fund holder workflow must remain intact.',
);

for (const model of [
  'export interface Commitment',
  'export interface SharedBillAssignment',
  'export interface SpaceFund',
]) {
  need(models.includes(model), `Existing canonical model is missing: ${model}`);
}

need(
  styles.includes('/* Household v2 Slice 1 - command centre */'),
  'Household v2 command-centre styles are missing.',
);

need(
  !centre.includes("collection(db, '"),
  'Household Command Centre must not create a parallel Firestore data model.',
);

console.log(
  `Household v2 Slice 1 command-centre checks passed (${checks.length} checks).`,
);