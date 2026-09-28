import fs from 'node:fs';

function fail(message) {
  console.error('VERIFY FAIL:', message);
  process.exit(1);
}

function read(path) {
  if (!fs.existsSync(path)) fail(path + ' is missing.');
  return fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
}

function must(content, marker, label) {
  if (!content.includes(marker)) {
    fail(label + ' missing marker: ' + marker);
  }
}

const mirror = read('src/features/business/AdbnTechMirrorWorkspace.tsx');

for (const marker of [
  'recordAdbnTechPayment',
  'syncLinkedCustomerBillingAfterPayment',
  'listAdbnCustomerLinksForBusiness(spaceId)',
  "item.status === 'accepted'",
  'syncAdbnCustomerBillingToBajetBn({',
  'Customer BajetBN Space updated with ',
  'The official ADBN TECH payment is saved, but the linked customer BajetBN Space did not refresh automatically',
]) {
  must(mirror, marker, 'ADBN payment customer-Space refresh');
}

const submitStart = mirror.indexOf('const submitRecordPayment');
const submitEnd = mirror.indexOf(
  'if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL)',
  submitStart,
);

if (submitStart < 0 || submitEnd < 0) {
  fail('Record Payment submit block could not be located.');
}

const submitBlock = mirror.slice(submitStart, submitEnd);
const recordIndex = submitBlock.indexOf('await recordAdbnTechPayment({');
const refreshIndex = submitBlock.indexOf(
  'await syncLinkedCustomerBillingAfterPayment({',
);

if (recordIndex < 0 || refreshIndex <= recordIndex) {
  fail('Customer Space refresh must run only after ADBN payment write-back.');
}

for (const forbidden of ['addDoc(', 'setDoc(', 'updateDoc(']) {
  if (submitBlock.includes(forbidden)) {
    fail('Record Payment must not create a second BajetBN payment record: ' + forbidden);
  }
}

const portal = read('src/features/linked-adbn/AdbnCustomerSpacePage.tsx');

if (
  portal.includes('recordAdbnTechPayment')
  || portal.includes('data-adbn-tech-record-payment')
) {
  fail('Customer ADBN Space must remain view-only for payment recording.');
}

for (const marker of [
  'data-adbn-customer-billing-plans',
  'data-adbn-customer-payment-history',
  'ADBN TECH is the source of truth',
]) {
  must(portal, marker, 'customer ADBN Space');
}

const repository = read('src/repositories/adbnTechIntegrationRepository.ts');
must(repository, 'recordAdbnTechPayment', 'secured ADBN write-back');
must(repository, "'recordBajetBnPayment'", 'secured ADBN callable');

console.log(
  'BajetBN ADBN payment -> linked customer Space refresh verification PASS',
);
