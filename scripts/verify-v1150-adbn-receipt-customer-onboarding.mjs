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

const register = read('src/features/auth/RegisterPage.tsx');
const payments = read('src/features/business/AdbnTechPaymentsWorkspace.tsx');
const links = read('src/features/linked-adbn/AdbnCustomerLinksPage.tsx');

for (const marker of [
  'new URLSearchParams(',
  ".get('returnTo')",
  "queryReturnTo.startsWith('/')",
  "!queryReturnTo.startsWith('//')",
]) must(register, marker, 'safe registration return path');

for (const marker of [
  'loadAdbnTechReadOnlySnapshot',
  'AdbnTechCustomerMirror',
  'createAdbnCustomerLinkInvitation',
  "customerLink.status",
  "'declined'",
  'adbnCustomer?.email',
  'businessSpaceId:',
  'adbnCustomerId:',
  'targetEmail:',
  "'/adbn-links?source=adbn-receipt'",
  "'?source=adbn-receipt'",
  "'&returnTo='",
  'Create or sign in to BajetBN, then accept your ADBN TECH customer link:',
]) must(payments, marker, 'receipt customer onboarding');

for (const forbidden of [
  "'&customerId='",
  "'?customerId='",
  "'&email='",
  "'?email='",
  "'&customerNo='",
  "'?customerNo='",
]) {
  if (payments.includes(forbidden)) {
    fail('Customer identifiers must not be exposed in the onboarding URL: ' + forbidden);
  }
}

for (const marker of [
  'useLocation',
  "=== 'adbn-receipt'",
  'data-adbn-receipt-onboarding-arrival',
  'Accept the customer link below',
  'Your Personal money stays private.',
  'Accept & create ADBN Space',
]) must(links, marker, 'receipt onboarding acceptance page');

if (payments.includes('graph.facebook.com') || payments.includes('twilio.com')) {
  fail('Receipt onboarding must keep WhatsApp as a manual browser action.');
}

console.log('BajetBN ADBN receipt customer onboarding verification PASS');
