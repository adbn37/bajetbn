import fs from 'node:fs';

function fail(message) {
  console.error('VERIFY FAIL:', message);
  process.exit(1);
}

function read(path) {
  if (!fs.existsSync(path)) {
    fail(path + ' is missing.');
  }

  return fs
    .readFileSync(path, 'utf8')
    .replace(/\\r\\n?/g, '\\n');
}

function must(content, marker, label) {
  if (!content.includes(marker)) {
    fail(
      label
      + ' missing marker: '
      + marker,
    );
  }
}

const repo =
  read(
    'src/repositories/adbnTechIntegrationRepository.ts',
  );

const payments =
  read(
    'src/features/business/AdbnTechPaymentsWorkspace.tsx',
  );

for (
  const marker of [
    'export interface AdbnTechPaymentReceiptShare',
    'createAdbnTechPaymentReceiptShare',
    "'createBajetBnPaymentReceiptShare'",
    'httpsCallable<',
    'paymentId',
  ]
) {
  must(
    repo,
    marker,
    'secured ADBN receipt-share callable',
  );
}

for (
  const forbidden of [
    'addDoc(',
    'updateDoc(',
    'deleteDoc(',
    'setDoc(',
  ]
) {
  if (
    repo.includes(
      forbidden,
    )
  ) {
    fail(
      'ADBN integration repository must not directly write Firestore: '
      + forbidden,
    );
  }
}

for (
  const marker of [
    '<th>Actions</th>',
    'data-adbn-payment-official-receipt',
    'data-adbn-payment-whatsapp-receipt',
    'openOfficialReceipt(',
    'shareOfficialReceiptToWhatsApp(',
    'createAdbnTechPaymentReceiptShare(',
    'View or download your official ADBN TECH receipt:',
    'Create or sign in to BajetBN, then accept your ADBN TECH customer link:',
    "'?source=adbn-receipt'",
    "'https://wa.me/'",
    'listAdbnCustomerLinksForBusiness',
    "customerLink?.status === 'accepted'",
    "'/adbn'",
    'colSpan={10}',
  ]
) {
  must(
    payments,
    marker,
    'permanent Payments receipt actions',
  );
}

if (
  payments.includes(
    'graph.facebook.com',
  )
  || payments.includes(
    'twilio.com',
  )
) {
  fail(
    'Payments receipt sharing must remain manual browser WhatsApp only.',
  );
}

console.log(
  'BajetBN permanent ADBN receipt + WhatsApp actions verification PASS',
);
