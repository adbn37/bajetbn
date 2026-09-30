import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }
  console.log('PASS: ' + message);
}

const sync =
  read('src/repositories/adbnTechPaymentSyncRepository.ts');
const workspace =
  read('src/features/business/AdbnTechPaymentsWorkspace.tsx');

check(
  sync.includes('adbnPaymentPostingIssue')
  && sync.includes("'missing_adbn_account'")
  && sync.includes("'unmapped_adbn_account'")
  && sync.includes("'broken_bajet_mapping'")
  && sync.includes("'invalid_status'"),
  'Payment posting blockers are classified by actual cause.',
);

check(
  sync.includes('No receiving account in ADBN')
  && sync.includes('Receiving account not mapped')
  && sync.includes('BajetBN mapping unavailable')
  && sync.includes('Source status not eligible'),
  'Block reasons have clear owner-facing descriptions.',
);

check(
  workspace.includes('paymentIssueCounts')
  && workspace.includes('data-adbn-payment-block-summary')
  && workspace.includes('missing receiving account')
  && workspace.includes('broken mapping')
  && workspace.includes('invalid / cancelled'),
  'Mapping footer reports accurate blocker categories instead of one misleading mapping count.',
);

check(
  !workspace.includes('paymentsNeedingMapping'),
  'Legacy combined require-account-mapping counter is removed.',
);

check(
  workspace.includes('data-adbn-payment-block-reason')
  && workspace.includes('postingIssue?.label')
  && workspace.includes('postingIssue?.detail'),
  'Each blocked payment row shows its specific reason.',
);

check(
  workspace.includes('item.bankAccountId'),
  'Payment search can locate records by receiving account ID.',
);

check(
  workspace.includes('paymentReady =')
  && workspace.includes('!postingIssue')
  && workspace.includes('mappedBajetAccount'),
  'Sync action is offered only when no classified blocker remains.',
);

console.log(
  'BajetBN ADBN TECH payment block reasons verification PASS',
);
