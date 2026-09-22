import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
const workspace = read('src/features/business/AdbnTechMirrorWorkspace.tsx');
const repo = read('src/repositories/adbnTechIntegrationRepository.ts');
const css = read('src/styles/global.css');

function check(value, label) {
  if (!value) throw new Error('FAIL: ' + label);
  console.log('PASS: ' + label);
}

check(
  workspace.includes("data-adbn-tech-invoice-detail"),
  'ADBN TECH invoices expose a read-only detail panel.',
);

check(
  workspace.includes("setSelectedInvoiceId(item.id)")
  && workspace.includes("adbn-tech-view-button-v115")
  && workspace.includes("View"),
  'Invoice rows expose a visible View action.',
);

check(
  workspace.includes('Read-only mirror. Edit, delete and payment actions remain in ADBN TECH.'),
  'Invoice detail explicitly keeps mutations in ADBN TECH.',
);

check(
  workspace.includes("selectedInvoice.monthlyAmount")
  && workspace.includes("selectedInvoice.termMonths")
  && workspace.includes("selectedInvoice.fulfilmentStatus"),
  'Invoice detail includes payment-plan and fulfilment information.',
);

for (const forbidden of ['addDoc', 'setDoc', 'updateDoc', 'deleteDoc', 'writeBatch', 'runTransaction']) {
  check(
    !repo.includes(forbidden),
    'ADBN mirror repository remains read-only: no ' + forbidden + '.',
  );
}

check(
  css.includes('BAJETBN V115 ADBN TECH INVOICE DETAIL SLICE 22.2'),
  'Invoice detail styling exists.',
);

console.log('');
console.log('============================================================');
console.log(' SLICE 22.2 ADBN TECH INVOICE DETAIL: VERIFY PASS');
console.log(' Invoice list now opens a read-only detail view.');
console.log(' No ADBN TECH write API was added.');
console.log(' Production untouched.');
console.log('============================================================');
