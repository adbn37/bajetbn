import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const repository =
  read('src/repositories/smePosRepository.ts');

const functions =
  read('functions/src/index.ts');

const storage =
  read('storage.rules');

let checks = 0;

function need(condition, message) {
  checks += 1;

  if (!condition) {
    throw new Error(message);
  }
}

need(
  !repository.includes("from 'firebase/storage'"),
  'SME POS repository still imports direct Firebase Storage.',
);

need(
  !repository.includes('uploadBytes('),
  'SME POS browser uploadBytes path still exists.',
);

for (const name of [
  'uploadSmePosItemPhoto',
  'getSmePosItemPhotoUrl',
  'deleteSmePosItemPhoto',
]) {
  need(
    repository.includes(
      `'${name}'`,
    ),
    `Client callable missing: ${name}`,
  );

  need(
    functions.includes(
      `export const ${name} = onCall`,
    ),
    `Backend callable missing: ${name}`,
  );
}

need(
  /export const uploadSmePosItemPhoto = onCall[\s\S]*?'cashier',\s*'stock_staff',\s*'seller',[\s\S]*?requireSellerPhotoManagement/.test(functions),
  'Cashier / Stock Staff / Seller photo-role coverage missing.',
);

need(
  /export const getSmePosItemPhotoUrl = onCall[\s\S]*?'seller',\s*'viewer',[\s\S]*?export const deleteSmePosItemPhoto = onCall/.test(functions),
  'Seller / Viewer photo-read coverage missing.',
);

need(
  functions.includes(
    'requireSellerPhotoManagement(',
  ),
  'Seller inventory-management protection missing.',
);

need(
  functions.includes(
    'inventoryManagementEnabled === true',
  ),
  'Seller inventory-management guard missing.',
);

need(
  functions.includes(
    'bytes.length >= 5 * 1024 * 1024',
  ),
  'Backend 5 MB photo limit missing.',
);

need(
  functions.includes(
    'firebaseStorageDownloadTokens',
  ),
  'Backend photo download-token support missing.',
);

need(
  functions.includes(
    '.file(photoPath)',
  ),
  'Server-side Storage file handling missing.',
);

need(
  storage.includes(
    'match /spaces/{spaceId}/sme-pos-items/{fileName}',
  ),
  'Existing Storage defense-in-depth rule disappeared.',
);

console.log(
  `SME POS backend photo hotfix checks passed (${checks} checks).`,
);
