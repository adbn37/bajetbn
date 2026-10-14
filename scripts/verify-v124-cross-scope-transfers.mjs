import fs from 'node:fs';

const transactionSource =
  fs.readFileSync(
    'src/features/transactions/TransactionsPage.tsx',
    'utf8',
  );

const businessSource =
  fs.readFileSync(
    'src/features/business/BusinessMoneyActivityPage.tsx',
    'utf8',
  );

const functionSource =
  fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  );

const checks = [
  [
    /function resolveTransferPostingSpaceId\(/.test(
      transactionSource,
    ),
    'Money Activity resolves the posting Space for transfers.',
  ],

  [
    /businessOnlySpaceIds[\s\S]*?businessSpaceIdsForAccount/
      .test(transactionSource),
    'Business-only accounts resolve canonical Business Space links.',
  ],

  [
    transactionSource.includes(
      'Move money between different Business Spaces is not supported in one transfer.',
    ),
    'Transfers across different Business Spaces are blocked.',
  ],

  [
    /type === 'transfer'[\s\S]*?account\.ownerId === user\?\.uid[\s\S]*?return true/
      .test(transactionSource),
    'Owners can select their own Personal or Business accounts during transfers.',
  ],

  [
    /const transferPairAllowed[\s\S]*?selectedSpace\?\.type !== 'sme'[\s\S]*?accountLinkedToSelectedBusiness/
      .test(transactionSource),
    'Business transfer pairs require a selected-Business account link.',
  ],

  [
    /const postingSpaceId[\s\S]*?resolveTransferPostingSpaceId\([\s\S]*?sourceAccount[\s\S]*?destinationAccount[\s\S]*?spaceId/
      .test(transactionSource),
    'Transfer submission resolves its posting Space from both accounts.',
  ],

  [
    /destinationAccountId:[\s\S]*?type === 'transfer'[\s\S]*?spaceId: postingSpaceId/
      .test(transactionSource),
    'Transfer submission sends the resolved posting Space to the backend.',
  ],

  [
    transactionSource.includes(
      "setSavedState({ mode: 'queued_with_files', spaceId: postingSpaceId",
    ),
    'Offline transfer state retains the resolved posting Space.',
  ],

  [
    transactionSource.includes(
      'uploadFiles(outcome.transactionId, postingSpaceId, pendingFiles)',
    ),
    'Transfer attachments use the resolved posting Space.',
  ],

  [
    /currentShareSnapshot\([\s\S]*?targetSpaceId = spaceId[\s\S]*?spaces\.find/
      .test(transactionSource),
    'Shared transfer details resolve the actual posting Space.',
  ],

  [
    /requestMoveOnly[\s\S]*?space\.ownerId === user\?\.uid[\s\S]*?\? entryAccounts[\s\S]*?: writableAccounts/
      .test(businessSource),
    'Business owners can use the full authoritative account pool for Move Money.',
  ],

  [
    /reverseDialog\.payload\.type === 'transfer'[\s\S]*?reverseDialog\.payload\.ownerId === user\?\.uid[\s\S]*?reverseTransaction/
      .test(businessSource),
    'Owner-created Business transfers use the normal transaction reversal path.',
  ],

  [
    /allowOwnedPersonalTransferAccount = false/
      .test(functionSource),
    'Backend transfer authorization has an explicit Personal-account exception flag.',
  ],

  [
    /ownedPersonalTransferAccount[\s\S]*?allowOwnedPersonalTransferAccount[\s\S]*?classification === 'personal'[\s\S]*?personalUseEnabled === true/
      .test(functionSource),
    'Backend allows owned Personal-capable accounts only for authorized transfers.',
  ],

  [
    (
      functionSource.match(
        /'Account',\s*type === 'transfer'/g,
      ) || []
    ).length >= 1,
    'Backend applies transfer authorization to the source account.',
  ],

  [
    (
      functionSource.match(
        /'Destination account',\s*type === 'transfer'/g,
      ) || []
    ).length >= 1,
    'Backend applies transfer authorization to the destination account.',
  ],

  [
    functionSource.includes(
      'A Business transfer must include an account linked to that Business Space.',
    ),
    'Backend rejects Business transfers with no account linked to that Business Space.',
  ],

  [
    functionSource.includes(
      'A Business-only account transfer must be recorded in its Business Space.',
    ),
    'Backend blocks Business-only accounts from posting through Personal context.',
  ],

  [
    functionSource.includes(
      'Transfer accounts must be different.',
    ),
    'Same-account transfers remain blocked.',
  ],

  [
    /memberStatus[\s\S]*?\['suspended', 'removed'\]\.includes/
      .test(functionSource),
    'Suspended or removed Space members remain blocked from posting.',
  ],

  [
    functionSource.includes(
      'Transfer accounts must use the same currency.',
    ),
    'Cross-currency transfers remain blocked.',
  ],
];

let failed = false;

for (const [passed, message] of checks) {
  if (passed) {
    console.log(`PASS: ${message}`);
  } else {
    failed = true;
    console.error(`FAIL: ${message}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  '\nBAJETBN v124 CROSS-SCOPE TRANSFER VERIFICATION PASS',
);
