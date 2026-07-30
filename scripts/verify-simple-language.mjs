import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'src/layouts/AppShell.tsx',
  'src/pages/DashboardPage.tsx',
  'src/features/accounts/AccountsPage.tsx',
  'src/features/transactions/TransactionsPage.tsx',
  'src/features/budgets/BudgetsPage.tsx',
  'src/features/goals/GoalsPage.tsx',
  'src/features/commitments/CommitmentsPage.tsx',
  'src/features/collaboration/CollaborationPage.tsx',
  'src/features/collaboration/JoinSpacePage.tsx',
  'src/features/spaces/SpacesPage.tsx',
  'src/utils/errors.ts',
];

const combined = files.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const forbidden = [
  'Complete legacy settlement',
  'Confirm & finalise',
  'Financial ledger',
  'Ledger-backed balances',
  'Payment claim approval',
  'Shared bills and payment claims',
  'Outstanding before payment',
  'Total commitment amount (BND)',
  'Reverse transaction',
  'Reverse payment',
  'Can view Account ledger',
  'Missing or insufficient permissions',
];
const required = [
  'Finish old payment',
  'Confirm payment',
  'Money activity',
  'Account activity',
  'Amount left before payment',
  'Full instalment total (BND)',
  'Undo payment',
  'You do not have access',
  'Add bill or instalment',
];

const problems = [];
for (const phrase of forbidden) if (combined.includes(phrase)) problems.push(`Old wording still found: ${phrase}`);
for (const phrase of required) if (!combined.includes(phrase)) problems.push(`Expected simple wording missing: ${phrase}`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Simple-language checks passed (${forbidden.length} old phrases removed, ${required.length} simple phrases confirmed).`);
