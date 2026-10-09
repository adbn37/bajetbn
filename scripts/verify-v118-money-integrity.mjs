import fs from 'node:fs';

const source =
  fs.readFileSync(
    'functions/src/index.ts',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
    return;
  }

  failures.push(message);
  console.error('FAIL:', message);
}

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);

  if (start < 0) {
    return '';
  }

  const end =
    endMarker
      ? source.indexOf(
          endMarker,
          start + startMarker.length,
        )
      : -1;

  return source.slice(
    start,
    end > start
      ? end
      : source.length,
  );
}

const businessAccountValidation =
  section(
    'async function validateBusinessAccountSpaces',
    'async function assertAccountForSpaceActor',
  );

const directPost =
  section(
    'export const postTransaction =',
    'export const getFinancialApprovalRequests =',
  );

const approvalReview =
  section(
    'export const reviewFinancialApprovalRequest =',
    'export const getBusinessQuotationWorkspace =',
  );

const reversal =
  section(
    'export const reverseTransaction =',
    '\nexport const ',
  );

check(
  /for \(const spaceId of businessSpaceIds\)[\s\S]{0,400}?space\.currency !== currency/m
    .test(businessAccountValidation)
  && !/posSpaceIds\.includes\(spaceId\)\s*&&\s*space\.currency !== currency/m
    .test(businessAccountValidation),
  'Every Business account link must match the linked Business Space currency.',
);

check(
  /\['suspended', 'removed'\]\.includes\([\s\S]{0,120}?memberStatus/m
    .test(directPost)
  && /canUseAccounts !== true/m
    .test(directPost),
  'Direct money posting rejects suspended or removed Space members before account use.',
);

check(
  /destinationAccountId\s*&&\s*destinationAccountId === accountId/m
    .test(directPost),
  'Direct transfers reject the same source and destination account.',
);

check(
  /account\.currency !== spaceCurrency/m
    .test(directPost)
  && /destination\.currency !== account\.currency/m
    .test(directPost),
  'Direct transfers enforce Space and destination currency boundaries.',
);

check(
  /transactionType === 'transfer'[\s\S]{0,220}?destinationAccountId === accountId/m
    .test(approvalReview),
  'Approved Business transfers revalidate that source and destination accounts are different.',
);

check(
  /const spaceCurrency[\s\S]{0,220}?account\.currency !== spaceCurrency[\s\S]{0,220}?Business Space currencies must match/m
    .test(approvalReview),
  'Approved Business money activity revalidates the source account against the current Business Space currency.',
);

check(
  /destination\.currency !== account\.currency/m
    .test(approvalReview)
  && /destination\.ownerId !== account\.ownerId/m
    .test(approvalReview),
  'Approved Business transfers remain same-currency and same-Account-Owner.',
);

check(
  /commandSnapshot\.exists[\s\S]{0,120}?commandSnapshot\.data\(\)\?\.result/m
    .test(directPost)
  && /kind: 'post_transaction'/m
    .test(directPost),
  'Direct posting remains idempotent through financialCommands.',
);

check(
  /original\.status !== 'posted' \|\| original\.reversedBy/m
    .test(reversal),
  'A posted transaction cannot be reversed twice.',
);

check(
  /original\.type === 'transfer'[\s\S]{0,220}?String\(original\.destinationAccountId\)[\s\S]{0,120}?String\(original\.accountId\)/m
    .test(reversal),
  'Reversal rejects corrupt legacy transfers whose source and destination are the same account.',
);

check(
  /entryType: 'reversal_transfer_source'/m
    .test(reversal)
  && /entryType: 'reversal_transfer_destination'/m
    .test(reversal),
  'Transfer reversal writes both reversal ledger entries.',
);

check(
  /kind: 'reverse_transaction'/m
    .test(reversal),
  'Transaction reversal remains idempotent through financialCommands.',
);

if (failures.length) {
  console.error('');

  failures.forEach(
    (failure) =>
      console.error('- ' + failure),
  );

  throw new Error(
    'v118 money integrity verification failed: '
    + failures.length
    + ' check(s).',
  );
}

console.log('');
console.log(
  'BAJETBN v118 MONEY INTEGRITY VERIFICATION PASS',
);
