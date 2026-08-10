import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8');

const auth = read(
  'src/layouts/AuthLayout.tsx',
);

const onboarding = read(
  'src/features/onboarding/OnboardingPage.tsx',
);

const i18n = read(
  'src/services/i18n.ts',
);

const css = read(
  'src/styles/global.css',
);

const scope = JSON.parse(
  read('scope/pre-v1-scope.json'),
);

const checks = [
  [
    auth.includes(
      "location.pathname === '/login'",
    ),
    'Login-only theme chooser guard is missing.',
  ],
  [
    auth.includes(
      '{isLogin && <ThemeChooser compact />}',
    ),
    'Login-only ThemeChooser is missing.',
  ],
  [
    auth.includes('signup-money-reminder'),
    'Signup reminder is missing.',
  ],
  [
    auth.includes(
      'A servant will not move',
    ),
    'English reminder is missing.',
  ],
  [
    auth.includes(
      'Tidak akan berganjak kaki',
    ),
    'Malay reminder is missing.',
  ],
  [
    auth.includes(
      'Your money, your goals,',
    ),
    'New Auth headline is missing.',
  ],
  [
    !auth.includes(
      'One place for the money',
    ),
    'Old Auth headline remains.',
  ],
  [
    onboarding.includes(
      '<ThemeChooser />',
    ),
    'Onboarding theme samples are missing.',
  ],
  [
    onboarding.includes(
      "useState<'details' | 'theme'>",
    ),
    'Two-step onboarding is missing.',
  ],
  [
    onboarding.includes(
      'Skip for now',
    ),
    'Skip action is missing.',
  ],
  [
    onboarding.includes(
      'anytime in Settings',
    ),
    'Settings guidance is missing.',
  ],
  [
    onboarding.includes(
      'updateUserAppearance(',
    ),
    'Theme profile save is missing.',
  ],
  [
    css.includes(
      '/* v0.11.18 signup theme onboarding */',
    ),
    'Signup/onboarding styles are missing.',
  ],
  [
    i18n.includes(
      'Wang anda, matlamat anda',
    ),
    'Malay headline is missing.',
  ],
];

const failures =
  checks
    .filter(([passed]) => !passed)
    .map(([, message]) => message);

const scopeItem =
  scope.items.find(
    (item) =>
      item.id
      === 'core.theme_presets_login',
  );

if (!scopeItem) {
  failures.push(
    'Theme preset scope item is missing.',
  );
}

if (failures.length) {
  console.error(
    failures
      .map((failure) => `- ${failure}`)
      .join('\n'),
  );

  process.exit(1);
}

console.log(
  'Signup reminder, login-only chooser and optional onboarding theme checks passed.',
);
