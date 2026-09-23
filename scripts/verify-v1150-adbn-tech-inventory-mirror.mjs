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
  'AdbnTechInventoryProductMirror',
  'AdbnTechInventoryReadOnlySnapshot',
  'loadAdbnTechInventoryReadOnly',
  "'products'",
  'reservedStock',
  'minimumStock',
  'latestLandedUnitCost',
  'availableStock:',
]) {
  must(
    repository,
    marker,
    'ADBN inventory repository',
  );
}

const loaderStart =
  repository.indexOf(
    'export async function loadAdbnTechInventoryReadOnly',
  );

if (loaderStart < 0) {
  fail('ADBN inventory loader is missing.');
}

const loader =
  repository.slice(loaderStart);

if (
  !loader.includes('getDocs(')
  || !loader.includes('collection(')
  || !loader.includes("'products'")
) {
  fail(
    'ADBN inventory loader must read the products collection.',
  );
}

for (const forbidden of [
  'addDoc(',
  'updateDoc(',
  'deleteDoc(',
  'setDoc(',
  'runTransaction(',
]) {
  if (loader.includes(forbidden)) {
    fail(
      'ADBN inventory loader must remain read-only: '
      + forbidden,
    );
  }
}

const workspace =
  read('src/features/business/AdbnTechInventoryWorkspace.tsx');

for (const marker of [
  'data-adbn-tech-inventory-workspace',
  'Read-only mirror',
  'On hand',
  'Reserved',
  'Available',
  'Low Stock',
  'Out of Stock',
  'ADBN TECH controls stock receiving, reservations, releases and deductions',
]) {
  must(
    workspace,
    marker,
    'ADBN inventory workspace',
  );
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
      'ADBN inventory workspace must remain read-only: '
      + forbidden,
    );
  }
}

const home =
  read('src/features/business/BusinessHomePage.tsx');

for (const marker of [
  'AdbnTechInventoryWorkspace',
  "| 'adbn_inventory'",
  "value === 'adbn_inventory'",
  "setWorkspaceView('adbn_inventory')",
  "workspaceView === 'adbn_inventory'",
  '<AdbnTechInventoryWorkspace',
]) {
  must(
    home,
    marker,
    'Business Home inventory integration',
  );
}

const pkg =
  read('package.json');

must(
  pkg,
  'verify-v1150-adbn-tech-inventory-mirror.mjs',
  'structural verifier chain',
);

console.log(
  'ADBN TECH Inventory mirror verification PASS',
);
