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

const portal =
  read('src/features/linked-adbn/AdbnCustomerSpacePage.tsx');

const css =
  read('src/styles/global.css');

check(
  portal.includes(
    'data-adbn-customer-space',
  )
  && portal.includes(
    'data-adbn-customer-hero',
  )
  && portal.includes(
    'Welcome, {customerName}',
  ),
  'Customer portal has a dedicated premium account hero.',
);

check(
  portal.includes(
    'ADBN TECH is the source of truth',
  )
  && portal.includes(
    'Separate from your Personal money.',
  ),
  'Existing source-of-truth and privacy boundary remains explicit.',
);

check(
  portal.includes(
    'data-adbn-customer-billing-plans',
  )
  && portal.includes(
    'data-adbn-customer-billing-record',
  )
  && portal.includes(
    'data-adbn-customer-payment-history',
  ),
  'Existing billing and payment-history verifier hooks remain intact.',
);

check(
  portal.includes(
    'data-adbn-customer-space-billing-placeholder',
  ),
  'Pre-sync customer billing placeholder remains intact.',
);

check(
  portal.includes(
    'role="progressbar"',
  )
  && portal.includes(
    'progressFor(',
  )
  && portal.includes(
    'Your payment plans',
  )
  && portal.includes(
    'Recent payments',
  ),
  'Portal gives payment progress, plan detail and payment history stronger hierarchy.',
);

check(
  !portal.includes(
    'recordAdbnTechPayment',
  )
  && !portal.includes(
    'data-adbn-tech-record-payment',
  ),
  'Customer portal remains view-only for ADBN payment recording.',
);

check(
  css.includes(
    '.adbn-customer-hero-v2',
  )
  && css.includes(
    '.adbn-customer-overview-v2',
  )
  && css.includes(
    '.adbn-customer-plan-grid-v2',
  )
  && css.includes(
    '@media (max-width: 720px)',
  ),
  'Dedicated customer portal design is responsive across desktop and mobile.',
);

console.log(
  'BajetBN ADBN customer portal redesign verification PASS',
);
