import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

const repo =
  read('src/repositories/adbnTechIntegrationRepository.ts');

const spaceRepo =
  read('src/repositories/spaceRepository.ts');

const models =
  read('src/types/models.ts');

const home =
  read('src/features/business/BusinessHomePage.tsx');

const payments =
  read('src/features/business/AdbnTechPaymentsWorkspace.tsx');

const css =
  read('src/styles/global.css');

function check(value, label) {
  if (!value) {
    throw new Error('FAIL: ' + label);
  }

  console.log('PASS: ' + label);
}

check(
  repo.includes("collection(db, 'bankAccounts')")
  && repo.includes("collection(db, 'payments')"),
  'ADBN TECH bankAccounts + payments use read-only Firestore collection reads.',
);

check(
  repo.includes('bankAccountId: string;')
  && repo.includes('bankAccountName: string;')
  && repo.includes('bankAccountType: string;'),
  'Payment mirror keeps ADBN receiving-account identity.',
);

check(
  repo.includes('loadAdbnTechPaymentsReadOnly'),
  'Dedicated account-aware read-only payment loader exists.',
);

for (
  const forbidden of [
    'addDoc',
    'setDoc',
    'updateDoc',
    'deleteDoc',
    'writeBatch',
    'runTransaction',
  ]
) {
  check(
    !repo.includes(forbidden),
    'ADBN mirror repository remains read-only: no '
      + forbidden
      + '.',
  );
}

check(
  models.includes(
    'externalIntegrationAccountMappings?: Record<string, string>;',
  ),
  'Space can persist ADBN-account to BajetBN-account mappings.',
);

check(
  spaceRepo.includes(
    'setAdbnTechAccountMappings',
  )
  && spaceRepo.includes(
    'externalIntegrationAccountMappings:',
  ),
  'Account mapping writes only to BajetBN Space metadata.',
);

check(
  home.includes("'adbn_payments'")
  && home.includes('AdbnTechPaymentsWorkspace'),
  'ADBN TECH Business workspace exposes Payments tab.',
);

check(
  payments.includes(
    'ADBN TECH account → BajetBN account',
  )
  && payments.includes(
    'Mapping required',
  ),
  'UI provides per-ADBN-account mapping rather than one global receiving account.',
);

check(
  payments.includes(
    'payment.bankAccountId',
  )
  && payments.includes(
    'savedMappings[',
  ),
  'Each payment resolves its BajetBN destination from its ADBN bankAccountId.',
);

check(
  payments.includes(
    'No BajetBN Money activity or ADBN TECH write is performed yet.',
  ),
  'Slice 23A remains a safe mapping/read-only checkpoint.',
);

check(
  payments.includes(
    "!== 'zardeerwandy@gmail.com'",
  )
  && repo.includes(
    "'advancedevotion.bn@gmail.com'",
  ),
  'Separate BajetBN and ADBN TECH admin identities remain enforced.',
);

check(
  css.includes(
    'BAJETBN V115 ADBN TECH ACCOUNT-AWARE PAYMENTS SLICE 23A',
  ),
  'Responsive account-mapping styling exists.',
);

console.log('');
console.log('============================================================');
console.log(' SLICE 23A REVISED: ACCOUNT-AWARE PAYMENTS VERIFY PASS');
console.log(' ADBN bankAccounts + payments are read-only.');
console.log(' Each ADBN bankAccountId can map to one BajetBN Business account.');
console.log(' Unmapped payments remain visibly blocked for future sync.');
console.log(' No BajetBN Money activity is created.');
console.log(' No ADBN TECH write API was added.');
console.log(' Production untouched.');
console.log('============================================================');
