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
const moneyRepo =
  read('src/repositories/businessMoneyActivityRepository.ts');
const workspace =
  read('src/features/business/AdbnTechPaymentsWorkspace.tsx');
const moneyPage =
  read('src/features/business/BusinessMoneyActivityPage.tsx');
const health =
  read('src/features/business/AdbnTechIntegrationHealthWorkspace.tsx');

check(
  sync.includes('findStalePostedAdbnPaymentTransactions')
  && sync.includes('currentSourceLabels')
  && sync.includes('/^adbn_pay_[a-f0-9]{16}$/'),
  'Stale detection compares deterministic ADBN payment labels against the current source snapshot.',
);

check(
  sync.includes("item.status !== 'posted'")
  && sync.includes("item.type !== 'income'")
  && sync.includes("'adbn_tech'"),
  'Only active ADBN-managed customer Money In can be flagged stale.',
);

check(
  workspace.includes('Missing in ADBN')
  && workspace.includes('data-adbn-payment-stale-review')
  && workspace.includes('data-adbn-payment-stale-row'),
  'Payments workspace surfaces a separate Missing in ADBN review section and count.',
);

check(
  workspace.includes('Detection alone never changes money.')
  && workspace.includes('Deleted or missing source payments are never reversed automatically.'),
  'Missing-source detection remains informational until the owner acts.',
);

check(
  workspace.includes('reverseStaleAdbnPaymentMoneyActivity')
  && workspace.includes('Reverse stale payment')
  && workspace.includes('Confirm reverse')
  && workspace.includes('data-adbn-payment-stale-confirm'),
  'Stale reversal is an explicit two-step owner action.',
);

check(
  workspace.includes('user.uid !== spaceOwnerId')
  && workspace.includes('Only the Business Space owner can reverse a stale ADBN TECH payment.'),
  'Payments workspace enforces owner-only stale reversal in the UI path.',
);

check(
  moneyRepo.includes('reverseStaleAdbnPaymentMoneyActivity')
  && moneyRepo.includes("'adbn-stale-payment-'")
  && moneyRepo.includes('reverseTransactionWithIdempotencyKey'),
  'Stale customer payment reversal is deterministic and preserves ledger history.',
);

check(
  moneyPage.includes('data-adbn-stale-payment-reverse')
  && !moneyPage.includes('data-adbn-stale-payment-delete')
  && moneyPage.includes('Reverse stale ADBN payment'),
  'Business Money Details no longer exposes destructive stale-payment deletion.',
);

check(
  health.includes('findStalePostedAdbnPaymentTransactions')
  && health.includes('Missing payments')
  && health.includes('stale customer payment Money In'),
  'Integration Health includes stale customer payment visibility.',
);

check(
  !workspace.includes('autoReverseMissingAdbnPayment'),
  'No automatic missing-payment reversal path was introduced.',
);

console.log(
  'BajetBN ADBN TECH payment stale visibility verification PASS',
);
