import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const auth =
  read('src/layouts/AuthLayout.tsx');

const onboarding =
  read('src/features/onboarding/OnboardingPage.tsx');

const spaces =
  read('src/features/spaces/SpacesPage.tsx');

const functions =
  read('functions/src/index.ts');

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
  auth.includes(
    "location.pathname === '/login'",
  )
    && auth.includes(
      '{isLogin && <ThemeChooser compact />}',
    ),
  'Theme chooser remains login-only.',
);

check(
  auth.includes(
    'signup-money-reminder',
  )
    && auth.includes(
      'A servant will not move',
    )
    && auth.includes(
      'Tidak akan berganjak kaki',
    ),
  'Money reminder remains in English and Malay.',
);

check(
  !onboarding.includes(
    'ThemeChooser',
  ),
  'Theme chooser is removed from onboarding.',
);

check(
  !onboarding.includes(
    "useState<'details' | 'theme'>",
  )
    && !onboarding.includes(
      "step === 'theme'",
    ),
  'Onboarding is one focused Personal setup.',
);

check(
  onboarding.includes(
    'appearance: preferences.appearance',
  ),
  'Login/guest theme choice is preserved during onboarding.',
);

check(
  onboarding.includes(
    "'/spaces?welcome=1'",
  ),
  'New users continue to Space discovery.',
);

check(
  onboarding.includes(
    'changed later in Settings',
  ),
  'Onboarding explains theme can be changed later.',
);

check(
  spaces.includes(
    'welcomeFromOnboarding',
  )
    && spaces.includes(
      'space-discovery-welcome-v111',
    )
    && spaces.includes(
      'Your Personal Space is ready',
    ),
  'Spaces page provides first-run Space discovery guidance.',
);

check(
  functions.includes(
    "request.data?.appearance ?? 'dark'",
  )
    && functions.includes(
      'appearance, textSize',
    ),
  'Backend continues to save appearance safely.',
);

if (failures.length) {
  throw new Error(
    `Signup/Space discovery verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'Signup + Space discovery verification PASS.',
);
