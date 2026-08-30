import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const scope =
  JSON.parse(
    read('scope/final-development-completion.json'),
  );

const pkg =
  JSON.parse(
    read('package.json'),
  );

const app =
  read('src/app/App.tsx');

const functions =
  read('functions/src/index.ts');

const firestore =
  read('firestore.rules');

const storage =
  read('storage.rules');

const subscription =
  read('src/pages/SubscriptionPage.tsx');

const admin =
  read('src/pages/AdminPortalPage.tsx');

const adminRequests =
  read('src/components/AdminSubscriptionRequests.tsx');

const entitlements =
  read('src/services/entitlements.ts');

const debt =
  read('src/features/debt/DebtPage.tsx');

const debtRepo =
  read('src/repositories/debtRepository.ts');

const standardPos =
  read('src/features/sme-pos/StandardPosWorkspace.tsx');

const marketplacePos =
  read(
    'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  );

const posRepo =
  read('src/repositories/smePosRepository.ts');

const onboarding =
  read('src/features/onboarding/OnboardingPage.tsx');

const help =
  read('src/components/ContextualHelp.tsx');

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log(`PASS: ${label}`);
    return;
  }

  failures.push(label);
  console.error(`FAIL: ${label}`);
}

function scopeComplete(id) {
  return scope.items.some(
    (item) =>
      item.id === id
      && item.status === 'complete',
  );
}

check(
  scope.targetRelease ===
    'BajetBN v1.13.0',
  'Master scope targets v1.13.0.',
);

check(
  /LOCKED/i.test(
    scope.policy?.production || '',
  ),
  'Production remains explicitly locked.',
);

check(
  scope.excluded.some(
    (item) =>
      item.id === 'android.play_store',
  ),
  'Android / Play Store remains excluded.',
);

const requiredComplete = [
  'baseline.v112_accepted',

  'space_first.global_home_navigation',
  'space_first.personal',
  'space_first.household',
  'space_first.trip',
  'space_first.sme',

  'money.labels_multi_account',

  'collaboration.invitations_whatsapp_share_bill',
  'collaboration.advanced',

  'sme.pos_full_operations',
  'sme.seller_self_service',
  'sme.pos_sale_corrections',

  'collection.full_workflow',
  'spaces.extended_types_modules_avatars',

  'theme.personalisation',
  'safety.reliability_offline',

  'subscription.plus_admin',
  'debt.full_workflow',

  'business.v112_full',

  'onboarding.contextual_help',
  'onboarding.guided_setup',

  'release.final_repository_audit',
  'release.final_staging_acceptance',
];

for (const id of requiredComplete) {
  check(
    scopeComplete(id),
    `${id} is complete.`,
  );
}

const remaining =
  scope.items.filter(
    (item) =>
      item.status !== 'complete',
  );

check(
  remaining.length === 0,
  'All master development and final staging acceptance items are complete.',
);

// Subscription / Plus / Admin.
check(
  app.includes('path="subscription"')
    && app.includes('path="admin"'),
  'Subscription and Admin routes exist.',
);

check(
  subscription.includes(
    'Upload payment proof',
  )
    && subscription.includes(
      'Send proof/reference via WhatsApp',
    ),
  'Customer Plus payment-proof workflow exists.',
);

check(
  adminRequests.includes(
    'View payment proof',
  )
    && adminRequests.includes(
      'Approve Plus',
    )
    && adminRequests.includes(
      'Reject',
    ),
  'Admin Plus review workflow exists.',
);

check(
  entitlements.includes(
    'upgradeToPlusCopy(',
  )
    && entitlements.includes(
      'planLabel(',
    ),
  'Basic/Plus entitlement service exists.',
);

check(
  functions.includes(
    'export const createSubscriptionRequest =',
  )
    && functions.includes(
      'export const adminReviewSubscriptionRequest =',
    )
    && functions.includes(
      'export const processSubscriptionExpiries',
    ),
  'Subscription request, review and expiry backend exists.',
);

check(
  firestore.includes(
    'match /subscriptionRequests/{requestId}',
  )
    && storage.includes(
      'match /subscription-proofs/{uid}/{requestId}/{fileName}',
    ),
  'Subscription request and proof security rules exist.',
);

// Debt.
check(
  debt.includes('I Owe')
    && debt.includes('Owed to Me')
    && debt.includes('Record payment')
    && debt.includes('Attach proof'),
  'Debt user workflow is complete.',
);

check(
  debtRepo.includes('listDebts')
    && debtRepo.includes('recordDebtPayment')
    && debtRepo.includes('reverseDebtPayment')
    && debtRepo.includes('uploadDebtPaymentProof'),
  'Debt data and proof repository exists.',
);

check(
  functions.includes(
    'export const createDebt = onCall',
  )
    && functions.includes(
      'export const recordDebtPayment = onCall',
    )
    && functions.includes(
      'export const reverseDebtPayment = onCall',
    )
    && functions.includes(
      "itemType: 'debt'",
    ),
  'Debt backend, reversal and reminder support exists.',
);

check(
  firestore.includes(
    'match /debts/{debtId}',
  )
    && firestore.includes(
      'match /debtPayments/{paymentId}',
    ),
  'Debt security rules exist.',
);

// POS seller / correction history.
check(
  marketplacePos.includes(
    'Your seller profile',
  )
    && marketplacePos.includes(
      'My inventory',
    )
    && marketplacePos.includes(
      '+ Add stock',
    ),
  'Seller self-service remains present.',
);

check(
  functions.includes(
    'export const voidSmePosSale',
  )
    && posRepo.includes(
      'export async function voidSmePosSale',
    ),
  'POS sale void/reversal backend and repository exist.',
);

check(
  standardPos.includes(
    'Void sale and reverse',
  )
    && marketplacePos.includes(
      'Void sale and reverse',
    ),
  'Owner sale-void UI exists in both POS modes.',
);

check(
  functions.includes(
    'export const deleteSmePosSalePermanently =',
  )
    && standardPos.includes(
      'Delete permanently',
    )
    && marketplacePos.includes(
      'Delete permanently',
    ),
  'Audited permanent-sale deletion remains available.',
);

check(
  functions.includes(
    'requireSmePosPaymentAccountForSpace',
  ),
  'POS payment-account isolation remains enforced.',
);

// Onboarding + help.
check(
  onboarding.includes(
    'type OnboardingStep = 1 | 2 | 3;',
  )
    && onboarding.includes(
      '/spaces?welcome=1&setup=${purpose}',
    ),
  'Guided Onboarding is part of final product.',
);

check(
  help.includes(
    'markContextualHelpSeen',
  )
    && help.includes(
      'CONTEXTUAL_HELP_REPLAY_EVENT',
    ),
  'One-time contextual help with replay remains present.',
);

// Permanent regression coverage added by this audit.
const historicalCommand =
  pkg.scripts[
    'verify:historical-regression-v113'
  ] || '';

const requiredHistoricalTests = [
  'verify-subscription-backend.mjs',
  'verify-subscription-entitlements.mjs',
  'verify-v190-preprod-final.mjs',

  'verify-debt-v190.mjs',
  'verify-debt-payments-v190.mjs',
  'verify-debt-proof-reminders-v190.mjs',

  'verify-sme-pos-sale-void.mjs',
  'verify-sme-pos-sale-void-ui.mjs',

  'verify-v190-hardening-a.mjs',
  'verify-v190-hardening-b1.mjs',

  'verify-seller-self-service-payouts.mjs',
  'verify-sme-pos-account-isolation.mjs',
  'verify-unified-sme-invitations.mjs',
];

for (const verifier of requiredHistoricalTests) {
  check(
    historicalCommand.includes(verifier),
    `${verifier} is in the active historical regression gate.`,
  );
}

check(
  pkg.scripts[
    'verify:all-structural'
  ].includes(
    'npm run verify:historical-regression-v113',
  ),
  'Historical regression gate is permanent.',
);

check(
  pkg.scripts[
    'verify:all-structural'
  ].includes(
    'npm run verify:final-repository-audit-v113',
  ),
  'Final repository audit is permanent.',
);

// Known obsolete verifiers must remain historical only.
check(
  !pkg.scripts[
    'verify:all-structural'
  ].includes(
    'verify-simple-navigation-entitlements-v190.mjs',
  ),
  'Obsolete v1.8 version-locked navigation verifier is not reactivated.',
);

check(
  !pkg.scripts[
    'verify:all-structural'
  ].includes(
    'verify-seller-profile-consolidation.mjs',
  ),
  'Obsolete version-locked seller verifier is not reactivated.',
);

check(
  !pkg.scripts[
    'verify:all-structural'
  ].includes(
    'verify-space-avatar-v190.mjs',
  ),
  'Superseded avatar verifier is not reactivated.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  throw new Error(
    `Final repository audit failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  '=================================================',
);

console.log(
  ' BAJETBN v1.13 FINAL REPOSITORY AUDIT: PASS',
);

console.log(
  '=================================================',
);

console.log(
  'All registered development is complete.',
);

console.log(
  'Final integrated staging acceptance is complete.',
);
