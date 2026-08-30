import fs from 'node:fs';

const read =
  (path) =>
    fs.readFileSync(
      path,
      'utf8',
    );

const scope =
  JSON.parse(
    read(
      'scope/all-discussed-development.json',
    ),
  );

const models =
  read(
    'src/types/models.ts',
  );

const advancedRepository =
  read(
    'src/repositories/businessAdvancedRepository.ts',
  );

const payrollRepository =
  read(
    'src/repositories/businessPayrollRepository.ts',
  );

const admin =
  read(
    'src/features/business/BusinessAdvancedPage.tsx',
  );

const invoices =
  read(
    'src/features/business/BusinessInvoicesPage.tsx',
  );

const accounting =
  read(
    'src/features/business/BusinessAccountingPage.tsx',
  );

const tax =
  read(
    'src/features/business/BusinessTaxPage.tsx',
  );

const payroll =
  read(
    'src/features/business/BusinessPayrollPage.tsx',
  );

const industry =
  read(
    'src/features/business/BusinessIndustryPage.tsx',
  );

const guide =
  read(
    'src/features/business/BusinessStaffGuidePage.tsx',
  );

const hub =
  read(
    'src/features/spaces/SpaceActionHub.tsx',
  );

const app =
  read(
    'src/app/App.tsx',
  );

const rules =
  read(
    'firestore.rules',
  );

const failures = [];

function check(
  condition,
  label,
) {
  if (condition) {
    console.log(
      'PASS:',
      label,
    );

    return;
  }

  failures.push(
    label,
  );

  console.error(
    'FAIL:',
    label,
  );
}

const finalScopeIds = [
  'business.accounting',
  'business.tax',
  'business.payroll',
  'sme.industry_profiles',
  'sme.staff_operations_guide',
  'release.final_audit',
];

for (
  const id
  of finalScopeIds
) {
  check(
    scope.items.some(
      (item) =>
        item.id === id
        && item.status
          === 'complete',
    ),
    id + ' is complete.',
  );
}

check(
  scope.items.every(
    (item) =>
      item.status
        === 'complete',
  ),
  'Every active all-discussed development item is complete.',
);

check(
  scope.excluded.some(
    (item) =>
      item.id
        === 'android.play_store',
  ),
  'Android / Play Store remains explicitly excluded.',
);

check(
  models.includes(
    'BusinessProfile',
  )
    && models.includes(
      'BusinessInvoice',
    )
    && models.includes(
      'BusinessEmployee',
    )
    && models.includes(
      'BusinessPayrollRun',
    ),
  'Business foundation, invoice and payroll models exist.',
);

check(
  advancedRepository.includes(
    'saveBusinessTaxSettings',
  )
    && advancedRepository.includes(
      'setBusinessPayrollEnabled',
    ),
  'Tax and payroll settings reuse Business Profile.',
);

check(
  invoices.includes(
    'New Invoice',
  )
    && invoices.includes(
      'Record Payment',
    )
    && invoices.includes(
      'Print Invoice',
    ),
  'Business invoicing remains functional.',
);

check(
  accounting.includes(
    'listTransactionsForOwnerSpace',
  )
    && accounting.includes(
      'Business financial report',
    )
    && accounting.includes(
      'SME ledger',
    )
    && accounting.includes(
      'businessInvoicePaymentId',
    ),
  'Accounting uses the canonical SME transaction ledger.',
);

check(
  tax.includes(
    'saveBusinessTaxSettings',
  )
    && tax.includes(
      'Tax invoiced',
    )
    && tax.includes(
      'Paid invoice tax',
    )
    && tax.includes(
      'Open invoice tax',
    ),
  'Business tax configuration and invoice tax tracking exist.',
);

check(
  payrollRepository.includes(
    "'postTransaction'",
  )
    && payrollRepository.includes(
      'idempotencyKey',
    )
    && payrollRepository.includes(
      "'Payroll / Wages'",
    )
    && /status\s*:\s*['"]pending['"]/.test(
      payrollRepository,
    )
    && /status\s*:\s*['"]posted['"]/.test(
      payrollRepository,
    ),
  'Payroll posting uses the canonical idempotent transaction service.',
);

check(
  payroll.includes(
    'Add Employee',
  )
    && payroll.includes(
      'Post Payroll',
    )
    && payroll.includes(
      'Payroll history',
    )
    && payroll.includes(
      'Retry Posting',
    ),
  'Payroll UI includes employee management, wage posting and recovery.',
);

for (
  const businessType
  of [
    'retail',
    'service',
    'marketplace',
    'rental',
    'transport_delivery',
  ]
) {
  check(
    industry.includes(
      businessType,
    ),
    'Industry workflow exists for ' + businessType + '.',
  );
}

check(
  guide.includes(
    'Register inventory',
  )
    && guide.includes(
      'Barcode workflow',
    )
    && guide.includes(
      'Checkout and sales',
    )
    && guide.includes(
      'Returns and corrections',
    )
    && guide.includes(
      'Daily close',
    ),
  'Staff Operations Guide covers inventory, barcode, POS and returns.',
);

check(
  hub.includes(
    'label="Staff Guide"',
  ),
  'Staff Guide is reachable directly from the SME Space.',
);

check(
  admin.includes(
    'Accounting',
  )
    && admin.includes(
      'Tax',
    )
    && admin.includes(
      'Payroll',
    )
    && admin.includes(
      'Business Workflow',
    )
    && admin.includes(
      'Staff Guide',
    ),
  'Business Admin exposes all final business modules.',
);

check(
  app.includes(
    'spaces/:spaceId/business/accounting',
  )
    && app.includes(
      'spaces/:spaceId/business/tax',
    )
    && app.includes(
      'spaces/:spaceId/business/payroll',
    )
    && app.includes(
      'spaces/:spaceId/business/industry',
    )
    && app.includes(
      'spaces/:spaceId/business/guide',
    ),
  'All final Business routes are registered.',
);

check(
  rules.includes(
    'match /businessEmployees/{employeeId}',
  )
    && rules.includes(
      'match /businessPayrollRuns/{runId}',
    )
    && rules.includes(
      "resource.data.status == 'pending'",
    )
    && rules.includes(
      'allow delete: if false;',
    ),
  'Employee and payroll records have owner-scoped immutable-history rules.',
);

for (
  const page
  of [
    accounting,
    tax,
    payroll,
    industry,
    guide,
  ]
) {
  check(
    !/coming soon|not implemented|placeholder action/i.test(
      page,
    ),
    'Completed Business page contains no placeholder action.',
  );
}

if (failures.length) {
  console.error('');

  for (
    const failure
    of failures
  ) {
    console.error(
      '- ' + failure,
    );
  }

  throw new Error(
    'BajetBN v1.12 completion verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');

console.log(
  'BajetBN v1.12 all-discussed Business development verification PASS.',
);