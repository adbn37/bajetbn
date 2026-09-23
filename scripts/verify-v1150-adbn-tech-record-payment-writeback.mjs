import fs from 'node:fs';

function fail(message) {
  console.error('VERIFY FAIL:', message);
  process.exit(1);
}

function read(path) {
  if (!fs.existsSync(path)) {
    fail(path + ' is missing.');
  }

  return fs.readFileSync(
    path,
    'utf8',
  );
}

function must(
  content,
  marker,
  label,
) {
  if (!content.includes(marker)) {
    fail(
      label
      + ' missing marker: '
      + marker,
    );
  }
}

const secondary =
  read(
    'src/services/adbnTechFirebase.ts',
  );

must(
  secondary,
  'getFunctions,',
  'secondary ADBN Firebase',
);

must(
  secondary,
  "'asia-southeast1'",
  'secondary ADBN Firebase',
);

const repository =
  read(
    'src/repositories/adbnTechIntegrationRepository.ts',
  );

for (
  const marker
  of [
    'httpsCallable',
    'recordAdbnTechPayment',
    "'recordBajetBnPayment'",
    'loadAdbnTechBankAccountsReadOnly',
    'AdbnTechRecordPaymentResult',
  ]
) {
  must(
    repository,
    marker,
    'ADBN integration repository',
  );
}

for (
  const forbidden
  of [
    'addDoc(',
    'updateDoc(',
    'deleteDoc(',
    'setDoc(',
  ]
) {
  if (
    repository.includes(
      forbidden,
    )
  ) {
    fail(
      'ADBN integration repository must not directly write Firestore: '
      + forbidden,
    );
  }
}

const mirror =
  read(
    'src/features/business/AdbnTechMirrorWorkspace.tsx',
  );

for (
  const marker
  of [
    'data-adbn-tech-record-payment',
    'recordAdbnTechPayment',
    'paymentRequestId()',
    'Payment cannot exceed the current ADBN TECH invoice balance',
    'loadAdbnTechBankAccountsReadOnly',
    'syncAdbnTechPaymentToBajetBn',
    'externalIntegrationAccountMappings',
    'ADBN TECH remains the source of truth',
    'data-adbn-tech-record-payment-warning',
  ]
) {
  must(
    mirror,
    marker,
    'invoice workspace',
  );
}

const home =
  read(
    'src/features/business/BusinessHomePage.tsx',
  );

must(
  home,
  'view="invoices"',
  'Business Home invoice workspace',
);

must(
  home,
  'onFinancialSync={',
  'Business Home invoice financial refresh',
);

const pkg =
  read('package.json');

must(
  pkg,
  'verify-v1150-adbn-tech-record-payment-writeback.mjs',
  'package structural verifier chain',
);

console.log(
  'ADBN TECH Record Payment write-back verification PASS',
);

