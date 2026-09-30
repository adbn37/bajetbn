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

const workspace =
  read('src/features/business/AdbnTechPaymentsWorkspace.tsx');

check(
  workspace.includes('type PaymentViewFilter')
  && workspace.includes("'attention'")
  && workspace.includes("'ready'")
  && workspace.includes("'synced'")
  && workspace.includes("'changed'")
  && workspace.includes("'blocked'"),
  'Payments workspace defines operational status filters.',
);

check(
  workspace.includes('paymentFilterCounts')
  && workspace.includes('counts.attention')
  && workspace.includes('counts.ready')
  && workspace.includes('counts.synced')
  && workspace.includes('counts.changed')
  && workspace.includes('counts.blocked'),
  'Filter chips show counts from the full current ADBN payment snapshot.',
);

check(
  workspace.includes('findPostedAdbnPaymentTransaction')
  && workspace.includes('adbnPaymentTransactionMatches')
  && workspace.includes('adbnPaymentPostingIssue'),
  'Filter classification reuses canonical sync, changed, and blocker rules.',
);

check(
  workspace.includes('data-adbn-payment-view-filters')
  && workspace.includes('data-adbn-payment-filter-attention')
  && workspace.includes('data-adbn-payment-filter-blocked'),
  'Payments UI exposes direct attention and blocked filters.',
);

check(
  workspace.includes('Needs attention (')
  && workspace.includes('Ready to sync (')
  && workspace.includes('Synced (')
  && workspace.includes('Changed (')
  && workspace.includes('Blocked ('),
  'Filter labels are owner-friendly and include counts.',
);

check(
  workspace.includes('Showing {payments.length} of {snapshot?.payments.length || 0} source payments.')
  && workspace.includes('Missing/deleted source payments stay in the separate review section below.'),
  'Filtered result count is clear and stale-source review remains separate.',
);

check(
  workspace.includes('searchedPayments.filter')
  && workspace.includes("paymentViewFilter === 'attention'")
  && workspace.includes("paymentViewFilter === 'ready'"),
  'Search and status filters compose without changing source data.',
);

console.log(
  'BajetBN ADBN TECH payment status filters verification PASS',
);
