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
  'Theme chooser remains absent from onboarding.',
);

check(
  onboarding.includes(
    'type OnboardingStep = 1 | 2 | 3;',
  )
    && onboarding.includes(
      'BajetBN starts with your money',
    )
    && onboarding.includes(
      'Your first steps',
    )
    && onboarding.includes(
      'Personal money first',
    )
    && onboarding.includes(
      'Account = where money is kept',
    ),
  'Onboarding provides the Personal-First guided three-step setup.',
);

check(
  onboarding.includes(
    'appearance:',
  )
    && onboarding.includes(
      'preferences.appearance',
    ),
  'Login theme choice is preserved.',
);

check(
  onboarding.includes(
    '/?welcome=1',
  )
    && !onboarding.includes(
      '/spaces?welcome=1&setup=',
    ),
  'New users enter Personal-First Home before optional Space discovery.',
);

check(
  onboarding.includes(
    'sign-in page',
  )
    && onboarding.includes(
      'changed later in Settings',
    ),
  'Theme ownership is explained without adding a chooser.',
);

check(
  onboarding.includes(
    'Created automatically',
  )
    && !onboarding.includes(
      'createSpace(',
    ),
  'Personal Space remains automatic.',
);

check(
  !spaces.includes(
    'setupFromOnboarding',
  )
    && spaces.includes(
      'guided-onboarding-next-v113',
    )
    && spaces.includes(
      'Spaces are for shared or separate work',
    )
    && spaces.includes(
      'Personal money does not need a Space.',
    )
    && spaces.includes(
      'No Spaces yet',
    ),
  'Spaces page explains that personal money does not require a Space.',
);

check(
  !spaces.includes(
    "setupFromOnboarding === 'household'",
  )
    && !spaces.includes(
      "setupFromOnboarding === 'sme'",
    )
    && !spaces.includes(
      "setupFromOnboarding === 'trip'",
    )
    && spaces.includes(
      "values.type === 'sme'",
    )
    && spaces.includes(
      '/business/setup',
    ),
  'Optional Spaces stay user-initiated while Business setup remains type-aware.',
);

check(
  functions.includes(
    "request.data?.appearance ?? 'dark'",
  ),
  'Backend appearance compatibility remains intact.',
);

if (failures.length) {
  throw new Error(
    `Signup/Space discovery verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'Signup + guided Space discovery verification PASS.',
);
