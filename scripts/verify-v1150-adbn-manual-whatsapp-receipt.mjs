import fs from 'node:fs';
function fail(message) { console.error('VERIFY FAIL:', message); process.exit(1); }
function read(path) { if (!fs.existsSync(path)) fail(path + ' is missing.'); return fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n'); }
function must(content, marker, label) { if (!content.includes(marker)) fail(label + ' missing marker: ' + marker); }

const mirror = read('src/features/business/AdbnTechMirrorWorkspace.tsx');
for (const marker of [
  'buildTransactionShareUrl',
  'type AdbnRecordedPaymentShare =',
  'data-adbn-tech-manual-whatsapp-receipt',
  'WhatsApp receipt',
  'Receipt: ',
  'Remaining balance: ',
  'Next due: ',
  "'/adbn'",
  "'https://wa.me/'",
  'setPaymentShare({',
]) must(mirror, marker, 'manual WhatsApp payment receipt');

const submitStart = mirror.indexOf('const submitRecordPayment');
const submitEnd = mirror.indexOf('if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL)', submitStart);
const submitBlock = mirror.slice(submitStart, submitEnd);
const writeBack = submitBlock.indexOf('await recordAdbnTechPayment({');
const shareState = submitBlock.indexOf('setPaymentShare({');
if (writeBack < 0 || shareState <= writeBack) fail('Share context must be created only after ADBN write-back.');
must(submitBlock, 'outcome.transactionId', 'BajetBN payment summary transaction reference');
must(submitBlock, 'acceptedLink?.targetSpaceId', 'linked customer private Space preference');

const handlerStart = mirror.indexOf('const openPaymentReceiptWhatsApp');
const handlerEnd = mirror.indexOf('const submitRecordPayment', handlerStart);
const handler = mirror.slice(handlerStart, handlerEnd);
must(handler, 'window.open(', 'manual browser WhatsApp action');
must(handler, 'buildTransactionShareUrl({', 'safe BajetBN payment-summary fallback');
if (handler.includes('useEffect(')) fail('WhatsApp must remain click-only.');
if (mirror.includes('graph.facebook.com') || mirror.includes('twilio.com')) fail('No automatic WhatsApp provider allowed.');

const publicShare = read('src/services/transactionShare.ts');
must(publicShare, 'Public snapshot intentionally excludes:', 'existing safe transaction-share boundary');
must(publicShare, '/share/transaction#', 'existing BajetBN public summary link');
console.log('BajetBN manual ADBN WhatsApp receipt sharing verification PASS');
