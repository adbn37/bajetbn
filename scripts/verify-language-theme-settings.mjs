import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredFiles = [
  'src/contexts/PreferencesContext.tsx',
  'src/pages/SettingsPage.tsx',
  'src/services/i18n.ts',
  'LANGUAGE_THEME_SETTINGS_ALPHA.md',
];
for (const file of requiredFiles) assert.equal(fs.existsSync(file), true, `${file} is missing`);

const app = fs.readFileSync('src/app/App.tsx', 'utf8');
const preferences = fs.readFileSync('src/contexts/PreferencesContext.tsx', 'utf8');
const settings = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
const i18n = fs.readFileSync('src/services/i18n.ts', 'utf8');
const models = fs.readFileSync('src/types/models.ts', 'utf8');
const repository = fs.readFileSync('src/repositories/userRepository.ts', 'utf8');
const rules = fs.readFileSync('firestore.rules', 'utf8');
const styles = fs.readFileSync('src/styles/global.css', 'utf8');
const authLayout = fs.readFileSync('src/layouts/AuthLayout.tsx', 'utf8');
const onboarding = fs.readFileSync('src/features/onboarding/OnboardingPage.tsx', 'utf8');
const calendar = fs.readFileSync('src/features/calendar/CalendarPage.tsx', 'utf8');
const reports = fs.readFileSync('src/features/reports/ReportsPage.tsx', 'utf8');
const functions = fs.readFileSync('functions/src/index.ts', 'utf8');

const checks = [
  [app, 'PreferencesProvider', 'Preferences provider'],
  [preferences, "appearance: 'dark'", 'Dark default'],
  [preferences, "appearance === 'system'", 'Device-default appearance'],
  [preferences, "document.documentElement.dataset.theme", 'Theme application'],
  [preferences, "document.documentElement.dataset.textSize", 'Text-size application'],
  [preferences, 'MutationObserver', 'Whole-app language bridge'],
  [preferences, 'savePreferences', 'Saved preference action'],
  [settings, 'Language and appearance', 'Language and appearance section'],
  [settings, 'Use device setting', 'Device setting option'],
  [settings, 'Show reminders inside BajetBN', 'In-app reminder preference'],
  [settings, 'Show WhatsApp reminder buttons', 'WhatsApp preference'],
  [settings, 'Save settings', 'Save button'],
  [settings, 'Sign out of this device', 'Clear sign-out control'],
  [i18n, "'ms-BN'", 'Malay Brunei locale'],
  [i18n, 'malayPhrases', 'Malay phrase library'],
  [authLayout, 'Bahasa Melayu', 'Signed-out language switch'],
  [models, "export type Appearance = 'dark' | 'light' | 'system';", 'Appearance model'],
  [models, "export type TextSize = 'normal' | 'large';", 'Text-size model'],
  [models, 'whatsappRemindersEnabled?: boolean;', 'Reminder model fields'],
  [repository, 'updateUserPreferences', 'User preference repository'],
  [repository, "currency: 'BND'", 'BND preference lock'],
  [repository, "timezone: 'Asia/Brunei'", 'Brunei time lock'],
  [rules, "'appearance', 'textSize'", 'Preference rule fields'],
  [rules, "request.resource.data.currency == 'BND'", 'BND security rule'],
  [styles, ":root[data-theme='light']", 'Light theme styles'],
  [styles, ":root[data-text-size='large']", 'Large text styles'],
  [styles, '.preference-toggle-list', 'Settings layout styles'],
  [onboarding, '<option value="BND">BND — Brunei Dollar</option>', 'BND onboarding option'],
  [calendar, 'localeForLanguage(language)', 'Calendar Brunei locale'],
  [calendar, 'whatsappRemindersEnabled', 'Calendar WhatsApp preference'],
  [reports, 'localeForLanguage(language)', 'Report month locale'],
  [functions, "appearance: 'dark', textSize: 'normal'", 'New-user preference defaults'],
];
for (const [content, marker, label] of checks) assert.equal(content.includes(marker), true, `${label} is missing`);

assert.equal(onboarding.includes('MYR — Malaysian Ringgit'), false, 'Onboarding still offers MYR');
assert.equal(onboarding.includes('SGD — Singapore Dollar'), false, 'Onboarding still offers SGD');
assert.equal(onboarding.includes('USD — US Dollar'), false, 'Onboarding still offers USD');

const reminderDays = (value) => Math.min(30, Math.max(0, Math.round(value)));
assert.equal(reminderDays(-3), 0);
assert.equal(reminderDays(4.6), 5);
assert.equal(reminderDays(50), 30);

const resolveTheme = (appearance, device) => appearance === 'system' ? device : appearance;
assert.equal(resolveTheme('dark', 'light'), 'dark');
assert.equal(resolveTheme('light', 'dark'), 'light');
assert.equal(resolveTheme('system', 'light'), 'light');

console.log(`Language, theme and settings checks passed (${checks.length} structural checks plus preference calculations).`);
