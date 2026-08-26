import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const models =
  read('src/types/models.ts');

const offline =
  read('src/services/offlineQueue.ts');

const repository =
  read('src/repositories/transactionRepository.ts');

const page =
  read('src/features/transactions/TransactionsPage.tsx');

const functions =
  read('functions/src/index.ts');

const styles =
  read('src/styles/global.css');

const packageJson =
  JSON.parse(read('package.json'));

let checks = 0;

function need(condition, message) {
  checks += 1;

  if (!condition) {
    throw new Error(message);
  }
}

need(
  models.includes('labels?: string[];'),
  'FinancialTransaction labels missing.',
);

need(
  offline.includes('labels?: string[];'),
  'Offline Label payload missing.',
);

need(
  repository.includes('labels?: string[];'),
  'Repository Label input missing.',
);

for (const token of [
  'function transactionLabels(value: unknown)',
  'Use up to 8 labels.',
  'const labels = transactionLabels(request.data?.labels);',
  'labels,',
]) {
  need(
    functions.includes(token),
    `Backend Label support missing: ${token}`,
  );
}

for (const token of [
  'MAX_TRANSACTION_LABELS = 8',
  'availableLabels',
  'labelFilter',
  'All labels',
  'transaction-label-editor',
  'transaction-label-chip',
  'Previously used',
  'Category stays your main financial classification.',
  'labels,',
  'Search category, #label',
]) {
  need(
    page.includes(token),
    `Label UI missing: ${token}`,
  );
}

need(
  page.includes(
    "label.toLowerCase() === labelFilter.toLowerCase()",
  ),
  'Label filter matching is missing.',
);

need(
  page.includes('.map(transactionLabelText)'),
  '#Label search indexing is missing.',
);

need(
  page.includes(
    "if (type !== 'transfer' && !selectedCategory)",
  ),
  'Category must remain required.',
);

need(
  functions.includes(
    "const budgetIds = type === 'expense'",
  )
    && functions.includes(
      'matchingBudgetIds(budgetSnapshots, { spaceId, categoryId: category.id, transactionDate })',
    ),
  'Budgets must remain Category-based.',
);

need(
  styles.includes(
    'BAJETBN V1.10.3 TRANSACTION LABELS',
  ),
  'Label CSS missing.',
);

need(
  String(
    packageJson.scripts?.['verify:all-structural'] || '',
  ).includes(
    'verify-transaction-labels.mjs',
  ),
  'Label verifier is not registered.',
);

console.log(
  `Transaction Labels checks passed (${checks} checks).`,
);
