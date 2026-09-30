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

const health =
  read('src/features/business/AdbnTechIntegrationHealthWorkspace.tsx');

check(
  health.includes('const paymentHealth =')
  && health.includes('summary.attention')
  && health.includes('summary.changed')
  && health.includes('summary.blocked'),
  'Integration Health calculates source-payment attention, changed, and blocked counts.',
);

check(
  health.includes('adbnPaymentPostingIssue')
  && health.includes('adbnPaymentTransactionMatches')
  && health.includes('findPostedAdbnPaymentTransaction'),
  'Health classification shares canonical payment rules with the Payments workspace.',
);

check(
  health.includes("'missing_adbn_account'")
  && health.includes("'unmapped_adbn_account'")
  && health.includes("'broken_bajet_mapping'"),
  'Health summary breaks blockers into actionable account categories.',
);

check(
  health.includes('Payment attention <strong>{paymentHealth.attention}</strong>')
  && health.includes('data-adbn-payment-health-summary'),
  'Payment attention is visible in both top metadata and customer-payment card.',
);

check(
  health.includes('{stalePayments.length} missing in ADBN')
  && health.includes('source payment(s) need attention'),
  'Stale/missing payments remain separate from source-payment attention.',
);

check(
  health.includes('Invalid / cancelled {paymentHealth.invalid}')
  && health.includes('Changed {paymentHealth.changed}')
  && health.includes('Blocked {paymentHealth.blocked}'),
  'Customer-payment card exposes the detailed operational breakdown.',
);

check(
  health.includes('data-adbn-payment-health-review')
  && health.includes("openPayments(")
  && health.includes("'attention'"),
  'Integration Health provides a direct jump into payment attention review.',
);

check(
  !health.includes('setDoc(')
  && !health.includes('updateDoc(')
  && !health.includes('deleteDoc('),
  'Payment health summary remains read-only against ADBN TECH.',
);

console.log(
  'BajetBN ADBN TECH payment health summary verification PASS',
);
