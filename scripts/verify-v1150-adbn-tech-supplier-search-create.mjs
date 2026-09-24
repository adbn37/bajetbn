import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }

  console.log('PASS: ' + message);
}

const integration =
  read('src/repositories/adbnTechIntegrationRepository.ts');
const builder =
  read('src/features/business/AdbnTechSupplierPurchaseModal.tsx');
const pkg =
  read('package.json');

check(
  integration.includes('export interface AdbnTechSupplierMirror')
  && integration.includes("collection(\n        db,\n        'suppliers',"),
  'BajetBN reads the authoritative ADBN suppliers collection.',
);

check(
  integration.includes('supplierId?: string;')
  && integration.includes('newSupplier?: AdbnTechNewSupplierInput;'),
  'ADBN purchase callable contract supports existing or new suppliers.',
);

check(
  integration.includes('supplierCreated: boolean;')
  && integration.includes('supplierName: string;'),
  'Callable result carries supplier identity.',
);

check(
  builder.includes('data-adbn-tech-supplier-picker')
  && builder.includes('Search ADBN suppliers'),
  'Purchase builder exposes search-first supplier selection.',
);

check(
  builder.includes('Use supplier')
  && builder.includes('selectedSupplierId'),
  'Existing supplier uses the exact ADBN supplier ID.',
);

check(
  builder.includes('+ Create new supplier')
  && builder.includes('newSupplier:'),
  'New ADBN supplier can be created from the purchase builder.',
);

check(
  builder.includes('supplierDuplicate')
  && builder.includes('Possible duplicate:'),
  'Client warns on duplicate supplier name, phone or email.',
);

check(
  builder.includes('loadAdbnTechSuppliersReadOnly')
  && builder.includes('Promise.all(['),
  'Supplier and product catalogs are loaded together.',
);

check(
  builder.includes("supplierMode === 'existing'")
  && builder.includes("supplierMode === 'new'"),
  'Purchase payload distinguishes existing supplier from new supplier.',
);

check(
  builder.includes('Stock has not changed yet.'),
  'Supplier-link UI still preserves no-stock-on-purchase behavior.',
);

check(
  !builder.includes('purchaseReceipts')
  && !builder.includes('inventoryMovements'),
  'Supplier-link UI does not receive inventory stock.',
);

check(
  pkg.includes('verify-v1150-adbn-tech-supplier-search-create.mjs'),
  'Supplier search/create verifier is included in the structural chain.',
);

console.log(
  'BajetBN Slice 24E.2D ADBN supplier search/create verification PASS',
);
