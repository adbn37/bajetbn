import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

const models = read('src/types/models.ts');
const repository = read('src/repositories/spaceWorkRepository.ts');
const panel = read('src/features/spaces/SpaceWorkPanel.tsx');
const hub = read('src/features/spaces/SpaceActionHub.tsx');
const functions = read('functions/src/index.ts');
const rules = read('firestore.rules');
const packageJson = JSON.parse(read('package.json'));

let checks = 0;

function need(condition, message) {
  checks += 1;

  if (!condition) {
    throw new Error(message);
  }
}

for (const token of [
  'export interface SpaceWorkItem',
  "export type SpaceWorkItemKind = 'task' | 'buy'",
  'targetPriceMinor',
  'preferredPlace',
  'actualPriceMinor',
  'actualPlace',
  'purchasedOn',
  'linkedTransactionId',
  'assigneeUid',
  'priority',
]) {
  need(
    models.includes(token),
    'Space Work model missing: ' + token,
  );
}

for (const token of [
  'listSpaceWorkItems',
  'saveSpaceWorkItem',
  'setSpaceWorkItemStatus',
  'markSpaceWorkItemBought',
  'archiveSpaceWorkItem',
]) {
  need(
    repository.includes(token),
    'Space Work repository missing: ' + token,
  );
}

for (const text of [
  'To-Do',
  'To-Buy',
  'Purchase List',
  'Target / expected price',
  'Preferred shop / vendor / place',
  'Actual shop / vendor / place',
  'Purchase history',
  'Lowest recorded price',
  'Mark bought',
  'Reopen',
]) {
  need(
    panel.includes(text),
    'Space Work UI missing: ' + text,
  );
}

need(
  hub.includes('label="To-Do"')
    && hub.includes('label="To-Buy"'),
  'Household launcher must expose To-Do and To-Buy.',
);

need(
  hub.includes('label="Tasks"')
    && hub.includes('label="Purchase List"'),
  'SME launcher must expose Tasks and Purchase List.',
);

need(
  hub.includes('<SpaceWorkPanel'),
  'Space Action Hub must open the shared Space Work panel.',
);

need(
  rules.includes('match /spaceWorkItems/{itemId}')
    && rules.includes(
      'allow create, update, delete: if false;',
    ),
  'Space Work writes must remain server controlled.',
);

for (const token of [
  'export const saveSpaceWorkItem = onCall',
  'export const setSpaceWorkItemStatus = onCall',
  'export const markSpaceWorkItemBought = onCall',
  'export const archiveSpaceWorkItem = onCall',
  "db.collection('spaceWorkItems')",
  "'space_task_created'",
  "'space_buy_created'",
  "'space_task_completed'",
  "'space_buy_completed'",
]) {
  need(
    functions.includes(token),
    'Space Work backend missing: ' + token,
  );
}

need(
  functions.includes(
    "queryHasDocuments(db.collection('spaceWorkItems').where('spaceId', '==', spaceId))",
  ),
  'Space deletion guard must preserve Space Work history.',
);

need(
  functions.includes(
    "collectionName: 'spaceWorkItems', field: 'assigneeUid'",
  ),
  'Account deletion must anonymize Space Work assignees.',
);

need(
  !panel.includes('window.confirm(')
    && !panel.includes('window.alert('),
  'Space Work UI must not use browser-native confirmation.',
);

need(
  String(
    packageJson.scripts?.['verify:all-structural'] || '',
  ).includes('verify-space-work-items.mjs'),
  'Slice 2A verifier must be registered.',
);

console.log(
  'Space Tasks, Household To-Buy and SME Procurement checks passed (' +
    checks +
    ' checks).',
);
