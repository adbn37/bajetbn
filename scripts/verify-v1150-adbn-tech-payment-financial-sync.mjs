import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const transactionRepo =
  read('src/repositories/transactionRepository.ts');

const payments =
  read('src/features/business/AdbnTechPaymentsWorkspace.tsx');

const syncRepo =
  read('src/repositories/adbnTechPaymentSyncRepository.ts');

const home =
  read('src/features/business/BusinessHomePage.tsx');

const reports =
  read('src/features/business/BusinessReportsWorkspace.tsx');

const adbnRepo =
  read('src/repositories/adbnTechIntegrationRepository.ts');

const checks = [];

function need(condition, label) {
  checks.push(label);

  if (!condition) {
    throw new Error(label);
  }
}

need(
  transactionRepo.includes(
    'postTransactionWithIdempotencyKey',
  )
    && transactionRepo.includes(
      'ADBN TECH payment sync requires an online connection.',
    ),
  'Deterministic online transaction posting is installed.',
);

need(
  syncRepo.includes(
    "'adbn-payment-'",
  )
    && syncRepo.includes(
      "'adbn_pay_'",
    )
    && syncRepo.includes(
      "'income-sales'",
    ),
  'ADBN payment sync uses deterministic IDs and Sales income.',
);

need(
  payments.includes(
    'Sync to BajetBN',
  )
    && payments.includes(
      'syncPaymentToBajetBn',
    )
    && !payments.includes(
      'Sync mapped payments',
    ),
  'Historical backfill requires explicit per-payment action.',
);

need(
  syncRepo.includes(
    "'adbn_tech'",
  )
    && payments.includes(
      'syncedPaymentCount',
    ),
  'Synced payments are traceable and detected.',
);

need(
  payments.includes(
    'mappedAccountId',
  )
    && payments.includes(
      'savedMappings[',
    ),
  'Receiving-account mapping is required before posting.',
);

need(
  syncRepo.includes(
    'adbnPaymentCanPost',
  )
    && syncRepo.includes(
      "'cancel'",
    )
    && syncRepo.includes(
      "'void'",
    )
    && syncRepo.includes(
      "'reverse'",
    ),
  'Invalid/cancelled payment states remain blocked.',
);

need(
  home.includes(
    'refreshBusinessTransactions',
  )
    && home.includes(
      'onFinancialSync={',
    ),
  'Business Home refreshes after payment sync.',
);

need(
  reports.includes(
    "| 'money'",
  )
    && reports.includes(
      'listBusinessReportTransactionsForSpace',
    )
    && reports.includes(
      'moneyInTotal',
    )
    && reports.includes(
      'moneyOutTotal',
    )
    && reports.includes(
      'Net cashflow',
    ),
  'Reports includes canonical Money cashflow.',
);

need(
  reports.includes(
    "'ADBN TECH'",
  )
    && reports.includes(
      "'adbn_tech'",
    ),
  'Reports marks ADBN TECH-sourced Money activity.',
);

need(
  adbnRepo.includes(
    "getDocs(collection(db, 'payments'))",
  ),
  'ADBN payment source remains readable.',
);

for (const forbidden of [
  'addDoc(',
  'setDoc(',
  'updateDoc(',
  'deleteDoc(',
]) {
  need(
    !adbnRepo.includes(forbidden),
    `ADBN repository must stay read-only: ${forbidden}`,
  );
}

console.log(
  `ADBN TECH payment financial sync verification PASS (${checks.length} checks).`,
);
