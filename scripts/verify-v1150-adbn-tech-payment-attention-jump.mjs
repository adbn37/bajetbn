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
const payments =
  read('src/features/business/AdbnTechPaymentsWorkspace.tsx');

check(
  health.includes("bajetbn:adbn-payment-view-filter")
  && health.includes('const openPayments =')
  && health.includes("'attention'"),
  'Integration Health can request the payment attention view.',
);

check(
  health.includes('data-adbn-payment-health-review')
  && health.includes('Review {paymentHealth.attention} payment'),
  'Health warning exposes a direct review-attention action.',
);

check(
  health.includes('data-adbn-payment-health-open')
  && health.includes("? 'Review attention'")
  && health.includes('paymentHealth.attention > 0'),
  'Customer payment card opens attention view when review is needed.',
);

check(
  payments.includes('initialPaymentViewFilter')
  && payments.includes('window.sessionStorage.getItem')
  && payments.includes("requested === 'attention'"),
  'Payments workspace reads the requested operational filter.',
);

check(
  payments.includes('useState<PaymentViewFilter>(')
  && payments.includes('initialPaymentViewFilter,'),
  'Requested filter is applied before Payments renders.',
);

check(
  payments.includes('window.sessionStorage.removeItem')
  && payments.includes('PAYMENT_VIEW_FILTER_SESSION_KEY'),
  'Navigation hint is one-time and cleared after Payments opens.',
);

check(
  payments.includes("paymentViewFilter === 'attention'")
  && payments.includes('Needs attention ('),
  'Attention jump reuses the existing Needs attention filter.',
);

console.log(
  'BajetBN ADBN TECH payment attention jump verification PASS',
);
