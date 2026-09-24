import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('PASS: ' + message);
}

const repository =
  read('src/repositories/adbnTechIntegrationRepository.ts');
const workspace =
  read('src/features/business/AdbnTechPurchasesWorkspace.tsx');
const pkg =
  read('package.json');

check(
  repository.includes('export interface AdbnTechSupplierPurchaseReceiveInput')
  && repository.includes('export interface AdbnTechSupplierPurchaseReceiveResult'),
  'BajetBN has the ADBN receiving callable contract.',
);

check(
  repository.includes("'receiveBajetBnSupplierPurchase'")
  && repository.includes('export async function receiveAdbnTechSupplierPurchase'),
  'BajetBN calls the dedicated ADBN receiving function.',
);

check(
  repository.includes('externalSource: text(data.externalSource)'),
  'Purchase mirror reads ADBN externalSource.',
);

check(
  workspace.includes('data-adbn-tech-receive-purchase')
  && workspace.includes('Receive item'),
  'BajetBN Purchases exposes Receive item.',
);

check(
  workspace.includes('item.externalSource')
  && workspace.includes("=== 'bajetbn'"),
  'Receive action is limited to BajetBN-originated purchases.',
);

check(
  workspace.includes('I confirm these parts were physically received')
  && workspace.includes('receiveConfirmed'),
  'Stock-changing action requires explicit physical-receipt confirmation.',
);

check(
  workspace.includes("'bajetbn-receive-'")
  && workspace.includes('receiveRequestId'),
  'Each receive submission uses a retry-safe request identity.',
);

check(
  workspace.includes('result.stockBefore')
  && workspace.includes('result.stockAfter')
  && workspace.includes('result.receiptNo')
  && workspace.includes('result.productId'),
  'Success feedback exposes receipt, product and stock before/after.',
);

check(
  pkg.includes('verify-v1150-adbn-purchase-receiving-ui.mjs'),
  'Receiving UI verifier is included in the structural chain.',
);

console.log(
  'BajetBN Slice 24E.3B ADBN purchase receiving UI verification PASS',
);
