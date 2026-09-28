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
  if (!content.includes(marker)) fail(label + ' missing marker: ' + marker);
}

const mirror = read('src/features/business/AdbnTechMirrorWorkspace.tsx');
for (const marker of [
  'createAdbnTechPaymentReceiptShare',
  'type AdbnRecordedPaymentShare =',
  'data-adbn-tech-manual-whatsapp-receipt',
  'WhatsApp receipt',
  'Receipt: ',
  'Remaining balance: ',
  'Next due: ',
  "'/adbn'",
  "'https://wa.me/'",
  'setPaymentShare({',
  'paymentId:',
  'View or download your official ADBN TECH receipt:',
  'Track your ADBN TECH payments and instalments in BajetBN:',
]) must(mirror, marker, 'manual WhatsApp payment receipt');

if (mirror.includes('buildTransactionShareUrl')) fail('Post-payment WhatsApp must use the official ADBN receipt.');

const submitStart = mirror.indexOf('const submitRecordPayment');
const submitEnd = mirror.indexOf('if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL)', submitStart);
const submitBlock = mirror.slice(submitStart, submitEnd);
const writeBack = submitBlock.indexOf('await recordAdbnTechPayment({');
const shareState = submitBlock.indexOf('setPaymentShare({');
if (writeBack < 0 || shareState <= writeBack) fail('Share context must be created only after ADBN write-back.');
must(submitBlock, 'paymentId:', 'official ADBN payment ID field');
must(submitBlock, 'result.paymentId', 'official ADBN payment ID value');
must(submitBlock, 'acceptedLink?.targetSpaceId', 'linked customer private Space preference');

const handlerStart = mirror.indexOf('const openPaymentReceiptWhatsApp');
const handlerEnd = mirror.indexOf('const submitRecordPayment', handlerStart);
const handler = mirror.slice(handlerStart, handlerEnd);
must(handler, 'window.open(', 'manual browser WhatsApp action');
must(handler, 'createAdbnTechPaymentReceiptShare(', 'canonical ADBN receipt share');
if (handler.includes('useEffect(')) fail('WhatsApp must remain click-only.');
if (mirror.includes('graph.facebook.com') || mirror.includes('twilio.com')) fail('No automatic WhatsApp provider allowed.');

console.log('BajetBN manual ADBN official receipt WhatsApp verification PASS');
