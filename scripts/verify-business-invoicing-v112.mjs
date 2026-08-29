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

const repository =
  read(
    'src/repositories/businessInvoiceRepository.ts',
  );

const page =
  read(
    'src/features/business/BusinessInvoicesPage.tsx',
  );

const businessAdmin =
  read(
    'src/features/business/BusinessAdvancedPage.tsx',
  );

const app =
  read('src/app/App.tsx');

const functions =
  read(
    'functions/src/index.ts',
  );

const rules =
  read('firestore.rules');

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

  failures.push(label);

  console.error(
    'FAIL:',
    label,
  );
}

check(
  scope.items.some(
    (item) =>
      item.id
        === 'business.foundation'
      && item.status
        === 'complete',
  ),
  'Business foundation is complete.',
);

check(
  scope.items.some(
    (item) =>
      item.id
        === 'business.invoicing'
      && item.status
        === 'complete',
  ),
  'Business invoicing is complete.',
);

check(
  models.includes(
    'BusinessInvoiceStatus',
  )
    && models.includes(
      'BusinessInvoicePayment',
    )
    && models.includes(
      'businessInvoicePaymentId?: string | null',
    ),
  'Invoice and transaction linkage models exist.',
);

check(
  repository.includes(
    'createBusinessInvoice',
  )
    && repository.includes(
      'updateBusinessInvoice',
    )
    && repository.includes(
      'issueBusinessInvoice',
    )
    && repository.includes(
      'cancelBusinessInvoice',
    )
    && repository.includes(
      'recordBusinessInvoicePayment',
    ),
  'Invoice repository exposes full lifecycle actions.',
);

check(
  page.includes(
    'New Invoice',
  )
    && page.includes(
      'Create Draft',
    )
    && page.includes(
      'Record Payment',
    )
    && page.includes(
      'Print Invoice',
    )
    && page.includes(
      'Overdue',
    ),
  'Invoice UI supports creation, payment, print and overdue state.',
);

check(
  app.includes(
    'spaces/:spaceId/business/invoices',
  )
    && businessAdmin.includes(
      '/business/invoices',
    ),
  'Business Admin routes to invoices.',
);

check(
  functions.includes(
    'export const createBusinessInvoice',
  )
    && functions.includes(
      'export const updateBusinessInvoice',
    )
    && functions.includes(
      'export const issueBusinessInvoice',
    )
    && functions.includes(
      'export const cancelBusinessInvoice',
    )
    && functions.includes(
      'export const recordBusinessInvoicePayment',
    ),
  'Server invoice lifecycle functions exist.',
);

check(
  functions.includes(
    'businessInvoiceId',
  )
    && functions.includes(
      'businessInvoicePaymentId',
    )
    && functions.includes(
      "'income-sales'",
    )
    && functions.includes(
      'updateAccountBalance(',
    )
    && /db\.collection\s*\(/.test(
      functions,
    ),
  'Invoice payments use canonical transaction, ledger and Account balance posting.',
);

check(
  functions.includes(
    'invoicePaymentSnapshot',
  )
    && /status\s*:\s*['"]reversed['"]/.test(
      functions,
    )
    && functions.includes(
      'restoredPaid',
    ),
  'Generic transaction reversal restores invoice balances.',
);

check(
  rules.includes(
    'match /businessInvoices/{invoiceId}',
  )
    && rules.includes(
      'match /businessInvoicePayments/{paymentId}',
    )
    && rules.includes(
      'allow create, update, delete: if false;',
    ),
  'Invoice financial records are server-written.',
);

check(
  !/coming soon|not implemented|placeholder action/i.test(
    page,
  ),
  'Invoice page exposes no placeholder actions.',
);

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
    'Business invoicing verification failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  'Business invoicing verification PASS.',
);
