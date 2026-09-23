import fs from 'node:fs';

function fail(message) {
  console.error('VERIFY FAIL:', message);
  process.exit(1);
}

function read(path) {
  if (!fs.existsSync(path)) {
    fail(path + ' is missing.');
  }
  return fs.readFileSync(path, 'utf8');
}

function must(content, marker, label) {
  if (!content.includes(marker)) {
    fail(label + ' missing marker: ' + marker);
  }
}

const repository =
  read('src/repositories/adbnTechIntegrationRepository.ts');

for (const marker of [
  'AdbnTechInventoryMovementMirror',
  'AdbnTechInventoryMovementsReadOnlySnapshot',
  'loadAdbnTechInventoryMovementsReadOnly',
  "'inventoryMovements'",
  'quantityBefore',
  'quantityAfter',
  'movementType',
  'sourceType',
  'performedByEmail',
]) {
  must(repository, marker, 'ADBN inventory movement repository');
}

const loaderStart =
  repository.indexOf(
    'export async function loadAdbnTechInventoryMovementsReadOnly',
  );

if (loaderStart < 0) {
  fail('ADBN inventory movement loader is missing.');
}

const loader = repository.slice(loaderStart);

if (
  !loader.includes('getDocs(')
  || !loader.includes('collection(')
  || !loader.includes("'inventoryMovements'")
) {
  fail('ADBN inventory movement loader must read inventoryMovements.');
}

for (const forbidden of [
  'addDoc(',
  'updateDoc(',
  'deleteDoc(',
  'setDoc(',
  'runTransaction(',
  'httpsCallable(',
]) {
  if (loader.includes(forbidden)) {
    fail(
      'ADBN inventory movement loader must remain read-only: '
      + forbidden,
    );
  }
}

const workspace =
  read('src/features/business/AdbnTechInventoryWorkspace.tsx');

for (const marker of [
  "type InventoryView = 'stock' | 'history'",
  "setInventoryView('history')",
  'Stock History',
  'Inventory movement filter',
  'Stock In',
  'Stock Out',
  'Other',
  'quantityBefore',
  'quantityAfter',
  'ADBN status:',
  'inventoryMovements',
  'data-adbn-tech-inventory-history',
]) {
  must(workspace, marker, 'ADBN inventory history workspace');
}

for (const forbidden of [
  'addDoc(',
  'updateDoc(',
  'deleteDoc(',
  'setDoc(',
  'runTransaction(',
]) {
  if (workspace.includes(forbidden)) {
    fail(
      'ADBN inventory history workspace must remain read-only: '
      + forbidden,
    );
  }
}

const pkg = read('package.json');

must(
  pkg,
  'verify-v1150-adbn-tech-inventory-movements.mjs',
  'structural verifier chain',
);

console.log('ADBN TECH inventory movements verification PASS');
