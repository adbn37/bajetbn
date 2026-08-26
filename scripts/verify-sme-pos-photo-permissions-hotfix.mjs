import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const storage = read('storage.rules');
const functions = read('functions/src/index.ts');
const repository = read('src/repositories/smePosRepository.ts');
const errors = read('src/utils/errors.ts');

let checks = 0;

function need(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

const manageStart =
  storage.indexOf('function canManageSmePosItemPhoto(spaceId) {');

const manageEnd =
  storage.indexOf(
    'function canReadSmePosItemPhoto(spaceId) {',
    manageStart,
  );

need(
  manageStart >= 0 && manageEnd > manageStart,
  'SME POS photo permission helper is missing.',
);

const manageRule =
  storage.slice(manageStart, manageEnd);

for (const role of [
  'manager',
  'cashier',
  'stock_staff',
  'seller',
]) {
  need(
    manageRule.includes(`'${role}'`),
    `SME POS photo permission missing role: ${role}`,
  );
}

need(
  !manageRule.includes("'viewer'"),
  'Viewer must not receive SME POS item-photo upload permission.',
);

need(
  manageRule.includes('hasActiveSmePosAccess(spaceId)'),
  'SME POS photo upload must retain active POS access protection.',
);

need(
  storage.includes(
    'match /spaces/{spaceId}/sme-pos-items/{fileName}',
  ),
  'SME POS item-photo Storage path is missing.',
);

need(
  storage.includes(
    "request.resource.contentType.matches('image/.*')",
  ),
  'SME POS item-photo upload must remain image-only.',
);

need(
  storage.includes(
    'request.resource.size < 5 * 1024 * 1024',
  ),
  'SME POS item-photo upload must remain under 5 MB.',
);

need(
  repository.includes("'uploadSmePosItemPhoto'")
    && repository.includes("'getSmePosItemPhotoUrl'")
    && repository.includes("'deleteSmePosItemPhoto'"),
  'SME POS repository must delegate item-photo access through callable backend functions.',
);

need(
  !repository.includes('uploadBytes(ref(storage')
    && !repository.includes('deleteObject(ref(storage'),
  'SME POS repository must not bypass callable photo permission enforcement.',
);

need(
  functions.includes('uploadSmePosItemPhoto')
    && functions.includes('getSmePosItemPhotoUrl')
    && functions.includes('deleteSmePosItemPhoto')
    && functions.includes('sme-pos-items'),
  'SME POS backend photo handlers or Storage path changed unexpectedly.',
);

need(
  functions.includes(
    'seller.data()?.linkedUid !== uid',
  ),
  'Seller ownership protection is missing from backend.',
);

need(
  functions.includes(
    'seller.data()?.inventoryManagementEnabled !== true',
  ),
  'Seller inventory-management protection is missing from backend.',
);

need(
  errors.includes(
    "'storage/unauthorized': 'You are not allowed to open or upload this file.'",
  ),
  'Expected Storage unauthorized error mapping changed.',
);

console.log(
  `SME POS photo permission hotfix checks passed (${checks} checks).`,
);