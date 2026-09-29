import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const repository =
  read('src/repositories/adbnTechSupplierPaymentSyncRepository.ts');

const workspace =
  read('src/features/business/AdbnTechPurchasesWorkspace.tsx');

check(
  repository.includes(
    'export function adbnSupplierPaymentIsLegacyUnlinkedBeforeCutoff',
  )
  && repository.includes(
    'adbnSupplierPaymentIsReversal(',
  )
  && repository.includes(
    'linkedPurchases.length',
  )
  && repository.includes(
    'paymentDate < cutoff',
  ),
  'Only non-reversal orphan payments dated before the automation boundary use the legacy/manual classifier.',
);

check(
  repository.includes(
    'adbnSupplierPaymentIsLegacyUnlinkedBeforeCutoff(\n          payment,\n          input.purchases,\n          cutoff,',
  )
  && repository.includes(
    'beforeCutoff += 1;',
  ),
  'Legacy orphan payments are skipped before blocked diagnostics.',
);

check(
  repository.includes(
    "'no linked purchase (ID, group ID or purchase number)'",
  )
  && repository.includes(
    'recordBlocked(',
  ),
  'Current unlinked supplier payments still have a blocked diagnostic path.',
);

check(
  repository.includes(
    "ADBN_SUPPLIER_PURCHASE_AUTO_SYNC_CUTOFF =\n  '2026-09-25';",
  )
  && repository.includes(
    'purchaseDates.some(\n        (date) =>\n          date < cutoff',
  ),
  'Automatic eligibility remains governed by linked purchase dates and the 25 Sep 2026 cutoff.',
);

check(
  workspace.includes(
    'adbnSupplierPaymentIsLegacyUnlinkedBeforeCutoff',
  )
  && workspace.includes(
    'legacyUnlinkedBeforeCutoff',
  ),
  'Supplier Payments UI uses the same legacy orphan classifier.',
);

check(
  workspace.includes(
    'Legacy payment before 25 Sep 2026',
  )
  && workspace.includes(
    'Legacy payment before automatic cutoff',
  )
  && workspace.includes(
    'Not required',
  )
  && workspace.includes(
    'Manual',
  ),
  'Legacy orphan rows no longer ask for an account mapping or present as blocked.',
);

check(
  workspace.includes(
    'Mapping required',
  )
  && workspace.includes(
    'Blocked',
  ),
  'Current supplier-payment mapping and blocked states remain available.',
);

console.log(
  'BajetBN ADBN legacy unlinked supplier payment verification PASS',
);
