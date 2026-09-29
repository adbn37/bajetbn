import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const integration =
  read('src/repositories/adbnTechIntegrationRepository.ts');

const repository =
  read('src/repositories/adbnTechSupplierPaymentSyncRepository.ts');

const workspace =
  read('src/features/business/AdbnTechPurchasesWorkspace.tsx');

check(
  integration.includes(
    'purchaseGroupId: string;',
  )
  && integration.includes(
    'purchaseGroupId:\n          text(data.purchaseGroupId)',
  ),
  'ADBN purchase mirror retains purchaseGroupId.',
);

check(
  repository.includes(
    'payment.purchaseGroupId',
  )
  && repository.includes(
    'purchase.purchaseGroupId'
  )
  && repository.includes(
    '=== payment.purchaseGroupId',
  ),
  'Supplier payments can link grouped ADBN purchases by purchaseGroupId.',
);

check(
  repository.includes(
    'purchaseIds.has(',
  )
  && repository.includes(
    'purchase.purchaseNo'
  ),
  'Existing purchase ID and purchase number matching remain intact.',
);

check(
  repository.includes(
    'blockedDetails: string[];',
  )
  && repository.includes(
    'const recordBlocked ='
  )
  && repository.includes(
    'blockedDetails.length < 3',
  ),
  'Auto-sync captures concise blocked-payment diagnostics.',
);

check(
  repository.includes(
    'no linked purchase (ID, group ID or purchase number)',
  )
  && repository.includes(
    'ADBN account is not mapped to a BajetBN Business account',
  )
  && repository.includes(
    'supplier payment has no ADBN bank/cash account',
  ),
  'Common blocked supplier-payment causes are distinguishable.',
);

check(
  workspace.includes(
    'summary.blockedDetails.length',
  )
  && workspace.includes(
    'summary.blockedDetails.join'
  )
  && workspace.includes(
    "'Blocked reason'"
  ),
  'Purchases workspace surfaces blocked reasons for staging diagnosis.',
);

check(
  repository.includes(
    "ADBN_SUPPLIER_PURCHASE_AUTO_SYNC_CUTOFF =\n  '2026-09-25';",
  ),
  'The fixed 25 Sep 2026 purchase cutoff is unchanged.',
);

console.log(
  'BajetBN ADBN supplier payment group-link hotfix verification PASS',
);
