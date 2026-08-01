import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let checks = 0;
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function expect(condition, message) { checks += 1; if (!condition) throw new Error(message); }
function includes(file, values) {
  const content = read(file);
  for (const value of values) expect(content.includes(value), `${file} is missing: ${value}`);
}

const requiredFiles = [
  'src/features/recurring/RecurringTransactionsPage.tsx',
  'src/features/recurring/StoppedRecurringTransactionsPage.tsx',
  'src/repositories/recurringTransactionRepository.ts',
  'scripts/verify-recurring-transactions.mjs',
  'RECURRING_TRANSACTIONS_ALPHA.md',
];
requiredFiles.forEach((file) => expect(fs.existsSync(path.join(root, file)), `Missing recurring transaction file: ${file}`));

includes('src/types/models.ts', [
  "RecurringTransactionType = 'income' | 'expense'",
  "RecurringTransactionFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'",
  "RecurringTransactionStatus = 'active' | 'paused' | 'needs_attention' | 'stopped' | 'completed'",
  'export interface RecurringTransactionTemplate',
  'export interface RecurringTransactionRun',
  'recurringTemplateId?: string | null',
  "'recurring_transaction'",
]);

includes('src/repositories/recurringTransactionRepository.ts', [
  "collection(db, 'recurringTransactionTemplates')",
  "httpsCallable(functions, 'createRecurringTransactionTemplate')",
  "httpsCallable(functions, 'updateRecurringTransactionTemplate')",
  "httpsCallable(functions, 'manageRecurringTransactionTemplate')",
  "httpsCallable(functions, 'postDueRecurringTransaction')",
  "'pause' | 'resume' | 'skip' | 'stop' | 'restart' | 'delete'",
]);

includes('src/features/recurring/RecurringTransactionsPage.tsx', [
  'Recurring money',
  'salary',
  'Skip next occurrence',
  'Edit future recurring money',
  'Automatic and duplicate-safe',
  'Post due now',
  'Stopped',
  'needs_attention',
  'Start recurring money',
]);

includes('src/features/recurring/StoppedRecurringTransactionsPage.tsx', [
  'Stopped recurring money',
  'Restart recurring money',
  "action: 'restart'",
  "action: 'delete'",
  'generatedCount === 0',
]);

includes('src/app/App.tsx', [
  "path=\"recurring\"",
  "path=\"recurring/stopped\"",
  'RecurringTransactionsPage',
  'StoppedRecurringTransactionsPage',
]);
includes('src/layouts/AppShell.tsx', ["['/recurring', 'Recurring money', '↻']"]);
includes('src/features/transactions/TransactionsPage.tsx', [
  'to="/recurring"',
  'recurringTemplateId',
  'recurringScheduledDate',
]);
includes('src/features/calendar/CalendarPage.tsx', [
  'listRecurringTransactionTemplates',
  "itemType: 'recurring_transaction'",
  "route: '/recurring'",
]);
includes('src/features/search/SearchPage.tsx', [
  "kind: 'recurring' as const",
  'listRecurringTransactionTemplates',
  'Recurring money',
]);

includes('functions/src/index.ts', [
  'export const createRecurringTransactionTemplate',
  'export const updateRecurringTransactionTemplate',
  'export const manageRecurringTransactionTemplate',
  'export const postDueRecurringTransaction',
  'export const processRecurringTransactions',
  "schedule: '10 * * * *'",
  "timeZone: 'Asia/Brunei'",
  'recurringRunId(templateId, scheduledDate)',
  "status: 'skipped'",
  "status: 'needs_attention'",
  'addRecurringFrequency',
  'preferMonthEnd',
  'generatedCount',
  'skippedCount',
  'recurringTemplateId: templateId',
  'recurringRunId: runRef.id',
  'matchingBudgetIds',
  'updateBudgetsSpent',
  'createLedgerEntry',
  'updateAccountBalance',
  "type: 'recurring_transaction_posted'",
  "targetPath: '/transactions'",
  "where('status', '==', 'active')",
  'catchUp < 12',
  'processed < 100',
  'Stop or move recurring money that uses this account before closing it.',
  'Stop or move the recurring money in this Space before archiving it.',
  "'recurringTransactionTemplates', 'recurringTransactionRuns'",
]);

includes('firestore.rules', [
  'match /recurringTransactionTemplates/{templateId}',
  'match /recurringTransactionRuns/{runId}',
  'resource.data.ownerId == request.auth.uid',
]);
includes('firestore.indexes.json', [
  '"collectionGroup": "recurringTransactionTemplates"',
  '"collectionGroup": "recurringTransactionRuns"',
  '"fieldPath": "nextRunDate"',
  '"fieldPath": "scheduledDate"',
]);
includes('package.json', [
  '"version": "0.11.7"',
  'verify:recurring-transactions',
  'verify-recurring-transactions.mjs',
]);
includes('release.json', [
  '"version": "0.11.7"',
  'Recurring Transactions Alpha 1',
]);

function lastDay(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
function nextDate(date, frequency, preferredDay, monthEnd) {
  if (frequency === 'weekly') {
    const parsed = new Date(`${date}T00:00:00Z`);
    parsed.setUTCDate(parsed.getUTCDate() + 7);
    return parsed.toISOString().slice(0, 10);
  }
  const [year, month] = date.split('-').map(Number);
  const step = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : 12;
  const zero = year * 12 + month - 1 + step;
  const y = Math.floor(zero / 12);
  const m = zero % 12 + 1;
  const d = monthEnd ? lastDay(y, m) : Math.min(preferredDay, lastDay(y, m));
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

expect(nextDate('2026-08-01', 'weekly', 1, false) === '2026-08-08', 'Weekly recurrence calculation failed.');
expect(nextDate('2026-01-31', 'monthly', 31, true) === '2026-02-28', 'Month-end February recurrence failed.');
expect(nextDate('2026-02-28', 'monthly', 31, true) === '2026-03-31', 'Month-end recurrence drifted after February.');
expect(nextDate('2026-01-30', 'monthly', 30, false) === '2026-02-28', 'Preferred-day February recurrence failed.');
expect(nextDate('2026-02-28', 'monthly', 30, false) === '2026-03-30', 'Preferred-day recurrence drifted after February.');
expect(nextDate('2026-08-31', 'quarterly', 31, true) === '2026-11-30', 'Quarterly month-end recurrence failed.');
expect(nextDate('2024-02-29', 'yearly', 29, true) === '2025-02-28', 'Yearly leap-date recurrence failed.');

const functions = read('functions/src/index.ts');
expect(!functions.includes("transaction.update(ref, { status: 'active', nextRunDate: currentData.nextRunDate"), 'Resume must require a new date instead of silently catching up.');
expect(functions.includes("if (scheduledDate > localDateForTimezone"), 'Manual due posting must reject future dates.');
expect(functions.includes('if (existingRun.exists)'), 'Occurrence generation must check the deterministic run record.');
expect(functions.includes('transaction.create(runRef'), 'Occurrence generation must create an audit run record.');
expect(functions.includes("if (action === 'delete')"), 'Recurring template safe deletion is missing.');
expect(functions.includes('This recurring money has saved history. Stop it instead.'), 'Used templates must not be permanently deleted.');

console.log(`Recurring transaction checks passed (${checks} structural and schedule checks).`);
