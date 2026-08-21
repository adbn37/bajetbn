import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8');

const models = read(
  'src/types/models.ts',
);

const presets = read(
  'src/config/themePresets.ts',
);

const preferences = read(
  'src/contexts/PreferencesContext.tsx',
);

const chooser = read(
  'src/components/ThemeChooser.tsx',
);

const auth = read(
  'src/layouts/AuthLayout.tsx',
);

const settings = read(
  'src/pages/SettingsPage.tsx',
);

const repository = read(
  'src/repositories/userRepository.ts',
);

const rules = read(
  'firestore.rules',
);

const functions = read(
  'functions/src/index.ts',
);

const css = read(
  'src/styles/global.css',
);

const checklist = read(
  'STAGING_TEST_CHECKLIST.md',
);

const document = read(
  'THEME_PRESETS_LOGIN_ALPHA.md',
);

const scope = JSON.parse(
  read('scope/pre-v1-scope.json'),
);

const failures = [];

function expect(
  condition,
  message,
) {
  if (!condition) {
    failures.push(message);
  }
}

const presetsExpected = [
  ['system', 'System Default'],
  ['black', 'Black'],
  ['light', 'Light'],
  ['pink-white', 'Pink & White'],
  ['black-pink', 'Black & Pink'],
  ['midnight-teal', 'Midnight Teal'],
  ['navy-blue', 'Navy Blue'],
  ['forest-green', 'Forest Green'],
  ['royal-purple', 'Royal Purple'],
  ['sand-cream', 'Sand & Cream'],
  ['slate-grey', 'Slate Grey'],
  ['ocean-blue', 'Ocean Blue'],
  ['high-contrast', 'High Contrast'],
];

const allowedAppearanceValues = [
  ...presetsExpected.map(([value]) => value),
  'dark',
];

function valuesFromMatch(match) {
  return new Set(
    match
      ? [...match[1].matchAll(/'([^']+)'/g)]
        .map((item) => item[1])
      : [],
  );
}

const rulesAppearanceMatch =
  rules.match(
    /request\.resource\.data\.appearance\s+in\s+\[([\s\S]*?)\]/,
  );

const functionAppearanceMatch =
  functions.match(
    /const appearanceOptions\s*=\s*\[([\s\S]*?)\]\s*as const;/,
  );

const rulesAppearanceValues =
  valuesFromMatch(rulesAppearanceMatch);

const functionAppearanceValues =
  valuesFromMatch(functionAppearanceMatch);

for (const [value, label] of presetsExpected) {
  expect(
    presets.includes(`value: '${value}'`),
    `Missing preset registry value: ${value}`,
  );

  expect(
    presets.includes(`label: '${label}'`),
    `Missing preset registry label: ${label}`,
  );

  if (value !== 'system') {
    expect(
      css.includes(
        `data-theme='${value}'`,
      ),
      `Missing CSS tokens for ${value}`,
    );
  }
}

expect(
  Boolean(rulesAppearanceMatch),
  'Firestore appearance allowlist is missing.',
);

expect(
  Boolean(functionAppearanceMatch),
  'Onboarding appearance allowlist is missing.',
);

for (const value of allowedAppearanceValues) {
  expect(
    rulesAppearanceValues.has(value),
    `Firestore rules reject appearance: ${value}`,
  );

  expect(
    functionAppearanceValues.has(value),
    `Onboarding rejects appearance: ${value}`,
  );
}

expect(
  rulesAppearanceValues.size
    === allowedAppearanceValues.length,
  'Firestore appearance allowlist contains an unexpected value.',
);

expect(
  functionAppearanceValues.size
    === allowedAppearanceValues.length,
  'Onboarding appearance allowlist contains an unexpected value.',
);

expect(
  chooser.includes(
    'themeOptions.map(',
  ),
  'Theme chooser does not render the shared preset registry.',
);

expect(
  chooser.includes('option.label')
  && chooser.includes('option.labelMs'),
  'Theme chooser does not render English and Malay registry labels.',
);

expect(
  models.includes("'dark'; // Legacy value"),
  'Legacy dark value is not preserved.',
);

expect(
  presets.includes(
    "if (value === 'dark') return 'black';",
  ),
  'Legacy dark is not normalized to Black.',
);

expect(
  preferences.includes(
    'bajetbn.guestAppearance.v1',
  ),
  'Guest theme persistence marker is missing.',
);

expect(
  preferences.includes(
    'updateUserAppearance(',
  ),
  'Guest theme profile sync is missing.',
);

expect(
  repository.includes(
    'export async function updateUserAppearance',
  ),
  'Appearance-only profile update is missing.',
);

expect(
  auth.includes(
    '<ThemeChooser compact />',
  ),
  'Signed-out theme chooser is missing.',
);

expect(
  settings.includes(
    '<ThemeStudio />',
  ),
  'Settings Theme Studio is missing.',
);

expect(
  chooser.includes(
    'aria-checked={active}',
  ),
  'Theme chooser selected-state accessibility is missing.',
);

expect(
  css.includes(':focus-visible'),
  'Visible keyboard focus styles are missing.',
);

expect(
  document.includes(
    'Guest choice sync',
  ),
  'Theme feature document is incomplete.',
);

expect(
  checklist.includes(
    'v0.11.17 ? Login Theme Presets',
  ),
  'Theme staging checklist section is missing.',
);

const scopeItem =
  scope.items.find(
    (item) =>
      item.id
      === 'core.theme_presets_login',
  );

expect(
  Boolean(scopeItem),
  'Theme preset scope item is missing.',
);

expect(
  scopeItem?.status === 'complete',
  'Theme preset scope item must be complete after staging verification.',
);

expect(
  scopeItem?.gate === 'pre_v1',
  'Theme preset scope item must be pre_v1.',
);

if (failures.length) {
  console.error(
    failures
      .map(
        (failure) => `- ${failure}`,
      )
      .join('\n'),
  );

  process.exit(1);
}

console.log(
  'Login theme preset checks passed: 13 choices, guest persistence, profile sync, Settings reuse and shared tokens.',
);
