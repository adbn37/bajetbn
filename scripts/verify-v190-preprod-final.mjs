import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

const files = {
  config:
    read('src/config/subscription.ts'),
  subscription:
    read('src/pages/SubscriptionPage.tsx'),
  admin:
    read('src/pages/AdminPortalPage.tsx'),
  adminRequests:
    read('src/components/AdminSubscriptionRequests.tsx'),
  repo:
    read('src/repositories/subscriptionRequestRepository.ts'),
  posRepo:
    read('src/repositories/smePosRepository.ts'),
  standard:
    read('src/features/sme-pos/StandardPosWorkspace.tsx'),
  marketplace:
    read('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx'),
  app:
    read('src/app/App.tsx'),
  shell:
    read('src/layouts/AppShell.tsx'),
  entitlements:
    read('src/services/entitlements.ts'),
  functions:
    read('functions/src/index.ts'),
  firestore:
    read('firestore.rules'),
  storage:
    read('storage.rules'),
};

let failed = 0;

function check(condition, label) {
  console.log(
    `${condition ? 'PASS' : 'FAIL'} ${label}`,
  );

  if (!condition) failed += 1;
}

check(
  files.config.includes(
    "'6737173791'",
  ),
  'WhatsApp +6737173791',
);

check(
  files.config.includes(
    "'00008010010398'",
  ),
  'BIBD account',
);

check(
  files.config.includes(
    "'0300117741370'",
  ),
  'Baiduri account',
);

check(
  files.config.includes(
    'amountBnd: 4.90',
  )
  && files.config.includes(
    'amountBnd: 13',
  )
  && files.config.includes(
    'amountBnd: 24',
  )
  && files.config.includes(
    'amountBnd: 42',
  ),
  'Plus pricing 4.90/13/24/42',
);

check(
  !files.subscription.includes(
    'Subscribe via WhatsApp',
  ),
  'old subscription wording removed',
);

check(
  files.subscription.includes(
    'Upload payment proof',
  )
  && files.subscription.includes(
    'Send proof/reference via WhatsApp',
  ),
  'customer payment proof flow',
);

check(
  files.subscription.includes(
    'Payment proof / admin review:',
  ),
  'WhatsApp admin review link',
);

check(
  files.adminRequests.includes(
    'View payment proof',
  )
  && files.adminRequests.includes(
    'Approve Plus',
  )
  && files.adminRequests.includes(
    'Reject',
  ),
  'admin payment review UI',
);

check(
  files.functions.includes(
    'export const createSubscriptionRequest =',
  )
  && files.functions.includes(
    'export const submitSubscriptionPaymentProof =',
  )
  && files.functions.includes(
    'export const adminReviewSubscriptionRequest =',
  ),
  'subscription request backend',
);

check(
  files.admin.includes(
    'Grant Lifetime',
  )
  && files.functions.includes(
    "action === 'lifetime'",
  ),
  'admin-only Lifetime Plus',
);

check(
  !files.config.includes(
    "key: 'lifetime'",
  )
  && !files.subscription.includes(
    'Grant Lifetime',
  ),
  'Lifetime purchase option hidden from customer page',
);

check(
  files.app.includes(
    'path="settings/subscription"',
  )
  && files.app.includes(
    'to="/subscription"',
  ),
  'legacy route redirects',
);

check(
  !files.shell.includes(
    'to="/settings/subscription"',
  )
  && files.shell.includes(
    'to="/subscription"',
  ),
  'sidebar route fixed',
);

check(
  !files.entitlements.includes(
    "path: '/settings/subscription'",
  )
  && files.entitlements.includes(
    "path: '/subscription'",
  ),
  'upgrade helper route fixed',
);

check(
  files.posRepo.includes(
    'deleteSmePosSalePermanently',
  ),
  'POS permanent delete repository',
);

check(
  files.standard.includes(
    'Delete permanently',
  )
  && files.standard.includes(
    "confirmation: 'DELETE'",
  ),
  'Standard POS permanent delete',
);

check(
  files.marketplace.includes(
    'Delete permanently',
  )
  && files.marketplace.includes(
    "confirmation: 'DELETE'",
  ),
  'Marketplace POS permanent delete',
);

check(
  files.functions.includes(
    'export const deleteSmePosSalePermanently =',
  )
  && files.functions.includes(
    "['owner']",
  ),
  'owner-only permanent delete backend',
);

check(
  /kind:\s*['"]delete_sme_pos_sale_permanently['"]/.test(
    files.functions,
  )
  && /collection\(\s*['"]smePosDeletionAudit['"]\s*,?\s*\)/.test(
    files.functions,
  )
  && /transaction\.create\(\s*auditRef\s*,/.test(
    files.functions,
  ),
  'permanent deletion audit tombstone',
);

check(
  files.storage.includes(
    'match /subscription-proofs/{uid}/{requestId}/{fileName}',
  ),
  'payment proof Storage rules',
);

check(
  files.firestore.includes(
    'match /subscriptionRequests/{requestId}',
  )
  && files.firestore.includes(
    'match /smePosDeletionAudit/{auditId}',
  ),
  'server-authoritative Firestore rules',
);

if (failed) {
  console.error(
    `v1.9.0 pre-production verifier FAILED: ${failed}`,
  );

  process.exit(1);
}

console.log(
  'v1.9.0 pre-production verifier: PASS',
);
