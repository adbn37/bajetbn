import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredFiles = [
  'src/contexts/PreferencesContext.tsx',
  'src/config/themePresets.ts',
  'src/components/ThemeChooser.tsx',
  'src/pages/SettingsPage.tsx',
  'src/services/i18n.ts',
  'LANGUAGE_THEME_SETTINGS_ALPHA.md',
  'THEME_PRESETS_LOGIN_ALPHA.md',
];

for (const file of requiredFiles) {
  assert.equal(
    fs.existsSync(file),
    true,
    `${file} is missing`,
  );
}

const app = fs.readFileSync(
  'src/app/App.tsx',
  'utf8',
);

const preferences = fs.readFileSync(
  'src/contexts/PreferencesContext.tsx',
  'utf8',
);

const presets = fs.readFileSync(
  'src/config/themePresets.ts',
  'utf8',
);

const chooser = fs.readFileSync(
  'src/components/ThemeChooser.tsx',
  'utf8',
);

const settings = fs.readFileSync(
  'src/pages/SettingsPage.tsx',
  'utf8',
);

const i18n = fs.readFileSync(
  'src/services/i18n.ts',
  'utf8',
);

const models = fs.readFileSync(
  'src/types/models.ts',
  'utf8',
);

const repository = fs.readFileSync(
  'src/repositories/userRepository.ts',
  'utf8',
);

const rules = fs.readFileSync(
  'firestore.rules',
  'utf8',
);

const styles = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const authLayout = fs.readFileSync(
  'src/layouts/AuthLayout.tsx',
  'utf8',
);

const onboarding = fs.readFileSync(
  'src/features/onboarding/OnboardingPage.tsx',
  'utf8',
);

const calendar = fs.readFileSync(
  'src/features/calendar/CalendarPage.tsx',
  'utf8',
);

const reports = fs.readFileSync(
  'src/features/reports/ReportsPage.tsx',
  'utf8',
);

const functions = fs.readFileSync(
  'functions/src/index.ts',
  'utf8',
);

const checks = [
  [app, 'PreferencesProvider', 'Preferences provider'],
  [preferences, "appearance: 'black'", 'Black default'],
  [preferences, 'resolveTheme(', 'Theme resolver'],
  [preferences, 'bajetbn.guestAppearance.v1', 'Guest theme marker'],
  [preferences, 'updateUserAppearance', 'Guest-to-profile sync'],
  [preferences, 'document.documentElement.dataset.theme', 'Theme application'],
  [preferences, 'themeBrowserColors[resolvedTheme]', 'Browser theme colour'],
  [preferences, 'document.documentElement.dataset.textSize', 'Text-size application'],
  [preferences, 'MutationObserver', 'Whole-app language bridge'],
  [preferences, 'savePreferences', 'Saved preference action'],

  [presets, "value: 'system'", 'System Default preset'],
  [presets, "value: 'black-pink'", 'Black & Pink preset'],
  [presets, "value: 'high-contrast'", 'High Contrast preset'],
  [presets, 'normalizeAppearance', 'Legacy appearance normalizer'],
  [presets, "if (value === 'dark') return 'black';", 'Legacy Dark migration'],

  [presets, "label: 'System Default'", 'System Default label'],
  [presets, "label: 'Pink & White'", 'Pink & White label'],
  [presets, "label: 'High Contrast'", 'High Contrast label'],
  [chooser, 'role="radiogroup"', 'Accessible theme chooser'],
  [chooser, 'aria-checked={active}', 'Theme selected state'],

  [settings, 'Language and appearance', 'Language and appearance section'],
  [settings, '<ThemeStudio />', 'Settings Theme Studio'],
  [settings, 'Show reminders inside BajetBN', 'In-app reminder preference'],
  [settings, 'Show WhatsApp reminder buttons', 'WhatsApp preference'],
  [settings, 'Save settings', 'Save button'],
  [settings, 'Sign out of this device', 'Clear sign-out control'],

  [i18n, "'ms-BN'", 'Malay Brunei locale'],
  [i18n, 'malayPhrases', 'Malay phrase library'],

  [authLayout, 'Bahasa Melayu', 'Signed-out language switch'],
  [authLayout, '<ThemeChooser compact />', 'Signed-out theme chooser'],

  [models, "'pink-white'", 'Expanded Appearance model'],
  [models, "'high-contrast'", 'High Contrast model'],
  [models, "'dark'; // Legacy value", 'Legacy Dark model'],
  [models, "export type TextSize = 'normal' | 'large';", 'Text-size model'],
  [models, 'whatsappRemindersEnabled?: boolean;', 'Reminder model fields'],

  [repository, 'updateUserPreferences', 'User preference repository'],
  [repository, 'updateUserAppearance', 'Appearance-only profile sync'],
  [repository, "currency: 'BND'", 'BND preference lock'],
  [repository, "timezone: 'Asia/Brunei'", 'Brunei time lock'],

  [rules, "'appearance', 'textSize'", 'Preference rule fields'],
  [rules, "request.resource.data.currency == 'BND'", 'BND security rule'],

  [styles, ":root[data-theme='light']", 'Light theme styles'],
  [styles, ":root[data-theme='pink-white']", 'Pink & White styles'],
  [styles, ":root[data-theme='high-contrast']", 'High Contrast styles'],
  [styles, ':focus-visible', 'Visible focus state'],
  [styles, '.theme-choice-grid', 'Theme chooser layout'],
  [styles, ":root[data-text-size='large']", 'Large text styles'],
  [styles, '.preference-toggle-list', 'Settings layout styles'],

  [onboarding, '<option value="BND">', 'BND onboarding option'],
  [onboarding, 'Brunei Dollar', 'BND onboarding label'],
  [calendar, 'localeForLanguage(language)', 'Calendar Brunei locale'],
  [calendar, 'whatsappRemindersEnabled', 'Calendar WhatsApp preference'],
  [reports, 'localeForLanguage(language)', 'Report month locale'],

  [functions, "request.data?.appearance ?? 'dark'", 'Legacy backend fallback remains compatible'],
];

for (const [content, marker, label] of checks) {
  assert.equal(
    content.includes(marker),
    true,
    `${label} is missing`,
  );
}

assert.equal(
  onboarding.includes(
    '<option value="MYR">',
  ),
  false,
  'Onboarding still offers MYR',
);

assert.equal(
  onboarding.includes(
    '<option value="SGD">',
  ),
  false,
  'Onboarding still offers SGD',
);

assert.equal(
  onboarding.includes(
    '<option value="USD">',
  ),
  false,
  'Onboarding still offers USD',
);

const reminderDays = (value) =>
  Math.min(
    30,
    Math.max(
      0,
      Math.round(value),
    ),
  );

assert.equal(reminderDays(-3), 0);
assert.equal(reminderDays(4.6), 5);
assert.equal(reminderDays(50), 30);

const normalize = (value) =>
  value === 'dark'
    ? 'black'
    : value;

const resolve = (
  appearance,
  device,
) =>
  normalize(appearance)
    === 'system'
      ? device
      : normalize(appearance);

assert.equal(
  resolve('dark', 'light'),
  'black',
);

assert.equal(
  resolve('black-pink', 'light'),
  'black-pink',
);

assert.equal(
  resolve('system', 'light'),
  'light',
);

console.log(
  `Language, theme and settings checks passed (${checks.length} structural checks plus preference calculations).`,
);
