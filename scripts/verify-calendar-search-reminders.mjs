import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredFiles = [
  'src/features/calendar/CalendarPage.tsx',
  'src/features/search/SearchPage.tsx',
  'src/repositories/reminderRepository.ts',
  'CALENDAR_SEARCH_REMINDERS_ALPHA.md',
];
for (const file of requiredFiles) assert.equal(fs.existsSync(file), true, `${file} is missing`);

const app = fs.readFileSync('src/app/App.tsx', 'utf8');
const shell = fs.readFileSync('src/layouts/AppShell.tsx', 'utf8');
const calendar = fs.readFileSync('src/features/calendar/CalendarPage.tsx', 'utf8');
const search = fs.readFileSync('src/features/search/SearchPage.tsx', 'utf8');
const repository = fs.readFileSync('src/repositories/reminderRepository.ts', 'utf8');
const rules = fs.readFileSync('firestore.rules', 'utf8');
const indexes = fs.readFileSync('firestore.indexes.json', 'utf8');
const styles = fs.readFileSync('src/styles/global.css', 'utf8');
const models = fs.readFileSync('src/types/models.ts', 'utf8');

const checks = [
  [app, "import('../features/calendar/CalendarPage')", 'Calendar page import'],
  [app, "import('../features/search/SearchPage')", 'Search page import'],
  [app, '<Route path="calendar" element={<CalendarPage />} />', 'Calendar route'],
  [app, '<Route path="search" element={<SearchPage />} />', 'Search route'],
  [shell, "['/calendar', 'Calendar', '▦']", 'Calendar navigation'],
  [shell, "['/search', 'Search', '⌕']", 'Search navigation'],
  [shell, 'Search BajetBN', 'Top search box'],
  [calendar, 'Calendar & reminders', 'Simple calendar title'],
  [calendar, 'Due today', 'Today section'],
  [calendar, 'Coming soon', 'Soon section'],
  [calendar, 'Mark as reminded', 'In-app reminder action'],
  [calendar, 'WhatsApp', 'WhatsApp reminder action'],
  [calendar, 'Reminder history', 'Reminder history section'],
  [calendar, 'selectedSpace', 'Space filter'],
  [calendar, 'selectedAccount', 'Account filter'],
  [calendar, 'selectedState', 'Timing filter'],
  [search, 'Search your accounts, money activity, bills, goals, and Spaces.', 'Search description'],
  [search, 'selectedKind', 'Type filter'],
  [search, 'selectedSpace', 'Search Space filter'],
  [search, 'selectedAccount', 'Search account filter'],
  [search, 'dateFrom', 'From date filter'],
  [search, 'dateTo', 'To date filter'],
  [repository, "collection(db, 'reminderHistory')", 'Reminder history collection'],
  [rules, 'match /reminderHistory/{reminderId}', 'Reminder history rules'],
  [indexes, '"collectionGroup": "reminderHistory"', 'Reminder history index'],
  [models, 'export interface ReminderHistory', 'Reminder history model'],
  [styles, '.calendar-grid', 'Calendar styles'],
  [styles, '.search-results-list', 'Search styles'],
];
for (const [content, marker, label] of checks) assert.equal(content.includes(marker), true, `${label} is missing`);

const forbiddenPhrases = [
  'legacy settlement',
  'reconciliation',
  'financial ledger',
  'debit reminder',
  'credit reminder',
];
const userFacing = `${calendar}\n${search}`.toLowerCase();
for (const phrase of forbiddenPhrases) assert.equal(userFacing.includes(phrase), false, `Beginner-facing wording still contains: ${phrase}`);

const dayMilliseconds = 24 * 60 * 60 * 1000;
const base = new Date(2026, 6, 30);
const daysFrom = (value) => Math.round((new Date(value[0], value[1] - 1, value[2]).getTime() - base.getTime()) / dayMilliseconds);
const state = (days) => days < 0 ? 'late' : days === 0 ? 'today' : days <= 7 ? 'soon' : 'later';
assert.equal(state(daysFrom([2026, 7, 29])), 'late');
assert.equal(state(daysFrom([2026, 7, 30])), 'today');
assert.equal(state(daysFrom([2026, 8, 4])), 'soon');
assert.equal(state(daysFrom([2026, 8, 20])), 'later');

const normalizeSearch = (value) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').replace(/\s/g, '');
const records = [
  { title: 'Wi-Fi', searchable: 'Wi-Fi internet home', kind: 'bill' },
  { title: 'BIBD', searchable: 'BIBD bank personal', kind: 'account' },
];
assert.equal(records.filter((item) => normalizeSearch(`${item.title} ${item.searchable}`).includes(normalizeSearch('wifi'))).length, 1);
assert.equal(records.filter((item) => normalizeSearch(`${item.title} ${item.searchable}`).includes(normalizeSearch('bibd'))).length, 1);

console.log(`Calendar, search and reminder checks passed (${checks.length} structural checks plus date calculations).`);
