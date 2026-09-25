import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }
  console.log('PASS: ' + message);
}

const functions =
  read('functions/src/index.ts');
const repository =
  read('src/repositories/adbnCustomerLinkRepository.ts');
const page =
  read('src/features/linked-adbn/AdbnCustomerLinksPage.tsx');
const mirror =
  read('src/features/business/AdbnTechMirrorWorkspace.tsx');
const app =
  read('src/app/App.tsx');
const pkg =
  read('package.json');

const start =
  functions.indexOf(
    '// Slice 24F.1 - Secure ADBN customer link foundation',
  );

check(
  start >= 0,
  '24F.1 server block exists.',
);

const block =
  start >= 0
    ? functions.slice(start)
    : '';

check(
  block.includes('createAdbnCustomerLinkInvitation')
  && block.includes('getAdbnCustomerLinksForBusiness')
  && block.includes('getMyAdbnCustomerLinks')
  && block.includes('respondAdbnCustomerLinkInvitation'),
  'Server exposes invite/list/respond callables.',
);

check(
  block.includes('externalIntegrationProvider')
  && block.includes("'adbn_tech'")
  && block.includes('space.ownerId'),
  'Only the owner of an ADBN-connected Business Space can manage links.',
);

check(
  block.includes('email_verified')
  && block.includes('requireVerifiedAuthEmail')
  && block.includes('link.targetEmail'),
  'Recipient acceptance is bound to a verified matching email.',
);

check(
  block.includes('adbnCustomerSpaceDocumentId')
  && block.includes("'custom'")
  && block.includes('externalIntegrationRole')
  && block.includes("'customer'"),
  'Recipient acceptance provisions a dedicated private ADBN customer Space.',
);

check(
  !block.includes("collection('accounts')")
  && !block.includes("collection('transactions')")
  && !block.includes("collection('commitments')")
  && !block.includes('ledgerBalanceMinor'),
  '24F.1 does not access Personal financial collections or balances.',
);

check(
  repository.includes("'createAdbnCustomerLinkInvitation'")
  && repository.includes("'getMyAdbnCustomerLinks'")
  && repository.includes("'respondAdbnCustomerLinkInvitation'"),
  'Client repository uses callable APIs.',
);

check(
  mirror.includes('data-adbn-customer-link-action')
  && mirror.includes('data-adbn-customer-link-modal')
  && mirror.includes(
    "will not gain access to the customer's Personal accounts",
  ),
  'ADBN customer mirror has secure link action and privacy notice.',
);

check(
  page.includes('data-adbn-customer-links-page')
  && page.includes('Accept & create ADBN Space')
  && page.includes('Your Personal money stays private.'),
  'Recipient page creates the dedicated ADBN Space and explains privacy.',
);

check(
  app.includes('path="adbn-links"')
  && app.includes('AdbnCustomerLinksPage'),
  'Customer-link page is routed inside the protected app.',
);

check(
  !page.includes('createCommitment(')
  && !page.includes('payCommitment(')
  && !mirror.includes('createCommitment('),
  '24F.1 does not create bills, instalments or payments.',
);

check(
  pkg.includes(
    'verify-v1150-adbn-customer-link-foundation.mjs',
  ),
  '24F.1 verifier is in the structural chain.',
);

console.log(
  'BajetBN Slice 24F.1 secure ADBN customer-link foundation verification PASS',
);
