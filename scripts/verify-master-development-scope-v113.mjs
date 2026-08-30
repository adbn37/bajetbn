import fs from 'node:fs';

const scope = JSON.parse(
  fs.readFileSync(
    'scope/final-development-completion.json',
    'utf8',
  ),
);

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log(`PASS: ${label}`);
    return;
  }

  failures.push(label);
  console.error(`FAIL: ${label}`);
}

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
  'collection.full_workflow',
  'spaces.extended_types_modules_avatars',
  'theme.personalisation',
  'safety.reliability_offline',
  'business.v112_full',
  'onboarding.contextual_help',
];

const activeCompletionItems = [
  'onboarding.guided_setup',
  'release.final_repository_audit',
  'release.final_staging_acceptance',
];

check(
  scope.targetRelease === 'BajetBN v1.13.0',
  'Master scope targets BajetBN v1.13.0.',
);

check(
  scope.baseCheckpoint
    === '0740bb7660f37906332b13932e69e11b51183eba',
  'Master scope is anchored to the accepted v1.12 checkpoint.',
);

check(
  /LOCKED/i.test(scope.policy?.production || ''),
  'Production is explicitly locked.',
);

check(
  /may never by itself be treated as full-product completion/i.test(
    scope.policy?.scopeRule || '',
  ),
  'Narrow scopes cannot declare full-product completion.',
);

for (const id of requiredComplete) {
  check(
    scope.items.some(
      (item) =>
        item.id === id
        && item.status === 'complete',
    ),
    `${id} remains registered as complete.`,
  );
}

for (const id of activeCompletionItems) {
  check(
    scope.items.some(
      (item) =>
        item.id === id
        && (
          item.status === 'planned'
          || item.status === 'complete'
        ),
    ),
    `${id} remains in the active master program.`,
  );
}

check(
  scope.excluded.some(
    (item) =>
      item.id === 'android.play_store',
  ),
  'Android / Play Store remains explicitly excluded.',
);

if (failures.length) {
  throw new Error(
    `Master development scope verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'BajetBN v1.13 master development scope verification PASS.',
);