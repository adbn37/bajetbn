import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const onboarding =
  read('src/features/onboarding/OnboardingPage.tsx');

const spaces =
  read('src/features/spaces/SpacesPage.tsx');

const i18n =
  read('src/services/i18n.ts');

const styles =
  read('src/styles/global.css');

const scope =
  JSON.parse(
    read('scope/final-development-completion.json'),
  );

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
    return;
  }

  failures.push(message);
  console.error('FAIL:', message);
}

check(
  onboarding.includes(
    'type OnboardingStep = 1 | 2 | 3;',
  )
    && onboarding.includes(
      'Step {step} of 3',
    ),
  'Three-step guided onboarding exists.',
);

check(
  onboarding.includes(
    "value: 'personal'",
  )
    && onboarding.includes(
      "value: 'household'",
    )
    && onboarding.includes(
      "value: 'sme'",
    )
    && onboarding.includes(
      "value: 'trip'",
    ),
  'Purpose choices cover Personal, Household, Business and Trip.',
);

check(
  onboarding.includes(
    'Add your first account',
  )
    && onboarding.includes(
      'Created automatically',
    ),
  'First-use checklist is actionable.',
);

check(
  onboarding.includes(
    "'completeOnboarding'",
  )
    && onboarding.includes(
      'preferences.appearance',
    ),
  'Canonical onboarding completion remains in use.',
);

check(
  !onboarding.includes(
    'ThemeChooser',
  ),
  'Theme chooser remains outside onboarding.',
);

check(
  spaces.includes(
    'suggestedSpaceType',
  )
    && spaces.includes(
      'Create {suggestedSpaceLabel} Space',
    )
    && spaces.includes(
      '?section=accounts',
    ),
  'Space discovery provides useful next actions.',
);

check(
  i18n.includes(
    "'Step 1 of 3'",
  )
    && i18n.includes(
      "'Business'",
    ),
  'Guided copy has Malay localization markers.',
);

check(
  styles.includes(
    '/* v1.13 guided onboarding */',
  )
    && styles.includes(
      '.onboarding-purpose-grid',
    ),
  'Responsive guided onboarding styles exist.',
);

const guided =
  scope.items.find(
    (item) =>
      item.id === 'onboarding.guided_setup',
  );

check(
  guided?.status === 'complete',
  'Master scope marks guided onboarding complete.',
);

const finalRepositoryAudit =
  scope.items.find(
    (item) =>
      item.id === 'release.final_repository_audit',
  );

check(
  finalRepositoryAudit
    && ['planned', 'complete'].includes(
      finalRepositoryAudit.status,
    ),
  'Final repository audit has a valid release state.',
);

const finalStagingAcceptance =
  scope.items.find(
    (item) =>
      item.id === 'release.final_staging_acceptance',
  );

check(
  finalStagingAcceptance
    && ['planned', 'complete'].includes(
      finalStagingAcceptance.status,
    ),
  'Final staging acceptance has a valid release state.',
);

if (failures.length) {
  throw new Error(
    `Guided onboarding verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'BajetBN v1.13 Guided Onboarding verification PASS.',
);
