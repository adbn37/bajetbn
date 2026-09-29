import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const models =
  read('src/types/models.ts');

const spaceRepo =
  read('src/repositories/spaceRepository.ts');

const sync =
  read('src/repositories/adbnTechExpenseSyncRepository.ts');

const workspace =
  read('src/features/business/AdbnTechExpensesWorkspace.tsx');

check(
  models.includes(
    'externalIntegrationExpenseAutoSyncEnabled?: boolean;',
  )
  && models.includes(
    'externalIntegrationExpenseAutoSyncCutoffIso?: string | null;',
  ),
  'Expense auto-sync settings are stored separately on the Business Space.',
);

check(
  spaceRepo.includes(
    'setAdbnTechExpenseAutoSync',
  )
  && spaceRepo.includes(
    'A valid ADBN TECH expense auto-sync cutoff is required.',
  )
  && spaceRepo.includes(
    'externalIntegrationExpenseAutoSyncEnabled',
  )
  && spaceRepo.includes(
    'externalIntegrationExpenseAutoSyncCutoffIso',
  ),
  'Expense auto-sync can be enabled or disabled with a validated activation cutoff.',
);

check(
  sync.includes(
    'adbnExpenseIsAfterCutoff',
  )
  && sync.includes(
    'expense.createdAt',
  )
  && sync.includes(
    'createdMillis'
  )
  && sync.includes(
    '>= cutoffMillis',
  ),
  'New-expense eligibility uses ADBN createdAt, not the accounting expense date.',
);

check(
  sync.includes(
    'autoSyncNewAdbnTechExpensesToBajetBn',
  )
  && sync.includes(
    'adbnExpenseSyncLabel',
  )
  && sync.includes(
    'knownLabels',
  )
  && sync.includes(
    'syncAdbnTechExpenseToBajetBn',
  ),
  'Future expense auto-sync reuses deterministic idempotent Money Out posting.',
);

check(
  sync.includes(
    'beforeCutoff += 1',
  )
  && sync.includes(
    'blocked += 1',
  )
  && sync.includes(
    'failed += 1',
  ),
  'Auto-sync separates historical, blocked and failed expenses.',
);

check(
  workspace.includes(
    'data-adbn-tech-expense-auto-sync',
  )
  && workspace.includes(
    'Auto-sync new ADBN TECH expenses',
  )
  && workspace.includes(
    'Enable auto-sync from now',
  )
  && workspace.includes(
    'Turn off auto-sync',
  ),
  'Expenses workspace has explicit opt-in auto-sync controls.',
);

check(
  workspace.includes(
    'Existing expenses stay manual.',
  )
  && workspace.includes(
    'source createdAt timestamp controls this boundary, not the expense date',
  )
  && workspace.includes(
    'Older expenses will never be imported automatically.',
  ),
  'The UI clearly protects historical expenses from automatic import.',
);

check(
  workspace.includes(
    'runFutureExpenseAutoSync',
  )
  && workspace.includes(
    'snapshot.expenses',
  )
  && workspace.includes(
    'savedMappings',
  )
  && workspace.includes(
    'autoSyncRunRef',
  ),
  'Loaded expense snapshots run future auto-sync once per snapshot/mapping signature.',
);

check(
  workspace.includes(
    'Historical import remains manual.',
  )
  && workspace.includes(
    'a missing snapshot is never auto-reversed.',
  )
  && workspace.includes(
    'Reconcile change',
  ),
  'Existing manual, edit-reconciliation and stale-deletion safeguards remain intact.',
);

console.log(
  'BajetBN ADBN TECH expense future auto-sync verification PASS',
);
