import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8');

const models = read('src/types/models.ts');
const repository = read(
  'src/repositories/spaceWorkRepository.ts',
);
const panel = read(
  'src/features/spaces/SpaceWorkPanel.tsx',
);
const functions = read('functions/src/index.ts');
const storage = read('storage.rules');
const transactionRepository = read(
  'src/repositories/transactionRepository.ts',
);
const packageJson = JSON.parse(
  read('package.json'),
);

let checks = 0;

function need(condition, message) {
  checks += 1;

  if (!condition) {
    throw new Error(message);
  }
}

need(
  models.includes(
    'spaceWorkItemId?: string | null;',
  ),
  'Financial transactions must expose their Space Work link.',
);

need(
  models.includes(
    'linkedTransactionId?: string | null;',
  ),
  'Space Work items must expose the canonical transaction link.',
);

for (const token of [
  'uploadSpaceWorkItemPhoto',
  'getSpaceWorkItemPhotoUrl',
  'removeSpaceWorkItemPhoto',
  'recordSpaceWorkPurchaseExpense',
]) {
  need(
    repository.includes(token),
    'Space Work repository missing ' + token,
  );
}

for (const token of [
  'Item photo (optional)',
  'Replace item photo',
  'Remove photo',
  'Record as Household Expense',
  'Record as SME Purchase',
  'Receipt or photo (optional)',
  'PaymentMethodField',
  'Financial record linked',
]) {
  need(
    panel.includes(token),
    'Space Work UI missing ' + token,
  );
}

for (const token of [
  'export const setSpaceWorkItemPhoto = onCall',
  'export const removeSpaceWorkItemPhoto = onCall',
  'export const recordSpaceWorkPurchaseExpense = onCall',
  "entryType: 'space_work_purchase'",
  'spaceWorkItemId: itemId',
  'linkedTransactionId:',
  "kind: 'record_space_work_purchase_expense'",
]) {
  need(
    functions.includes(token),
    'Space Work backend missing ' + token,
  );
}

need(
  functions.includes(
    "actor.member.canUseAccounts !== true",
  ),
  'Financial conversion must preserve Space account permissions.',
);

need(
  functions.includes(
    "categorySnapshotFromData({",
  )
    && functions.includes(
      "requiredKind: 'expense'",
    ),
  'Purchase conversion must use the canonical category engine.',
);

need(
  functions.includes(
    'updateAccountBalance(',
  )
    && functions.includes(
      'createLedgerEntry(',
    )
    && functions.includes(
      'updateBudgetsSpent(',
    ),
  'Purchase conversion must update canonical financial state.',
);

need(
  storage.includes(
    'match /spaces/{spaceId}/work-items/{itemId}/{fileName}',
  ),
  'Shared item photo Storage rule is missing.',
);

need(
  storage.includes(
    'function canManageSpaceWork(spaceId)',
  ),
  'Item photos must use role-aware Storage access.',
);

need(
  transactionRepository.includes(
    'uploadTransactionAttachment',
  )
    && transactionRepository.includes(
      'users/\${uid}/transaction-receipts/\${input.transactionId}',
    ),
  'Purchase receipts must reuse the canonical transaction receipt system.',
);

need(
  !repository.includes(
    '/receipts/',
  ),
  'Space Work must not create a duplicate receipt storage system.',
);

need(
  String(
    packageJson.scripts?.[
      'verify:all-structural'
    ] || '',
  ).includes(
    'verify-space-work-financial-link.mjs',
  ),
  'Slice 2B verifier must be registered.',
);

console.log(
  'Space Work financial link + item photo checks passed ('
    + checks
    + ' checks).',
);
