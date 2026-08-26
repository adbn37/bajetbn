import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const repository = read(
  'src/repositories/smePosRepository.ts',
);

const functions = read(
  'functions/src/index.ts',
);

let checks = 0;

function need(value, message) {
  checks += 1;

  if (!value) {
    throw new Error(message);
  }
}

need(
  repository.includes(
    '25 * 1024 * 1024',
  ),
  '25 MB original camera-photo allowance missing.',
);

need(
  repository.includes(
    'SME_POS_ITEM_PHOTO_MAX_DIMENSION = 2560',
  ),
  '2560 px photo resize ceiling missing.',
);

need(
  repository.includes(
    '4 * 1024 * 1024',
  ),
  '4 MB optimized-photo target missing.',
);

need(
  repository.includes(
    '8 * 1024 * 1024',
  ),
  '8 MB optimized upload ceiling missing.',
);

need(
  repository.includes(
    'createImageBitmap(file)',
  ),
  'Browser camera-photo decoding missing.',
);

need(
  repository.includes(
    "document.createElement('canvas')",
  ),
  'Browser photo resize canvas missing.',
);

need(
  repository.includes(
    "'image/jpeg'",
  ),
  'Optimized JPEG output missing.',
);

need(
  repository.includes(
    'const preparedFile =',
  )
    && repository.includes(
      'await optimizeSmePosItemPhoto(file)',
    ),
  'Photo optimization is not applied before upload.',
);

need(
  repository.includes(
    'await fileToBase64(preparedFile)',
  ),
  'Callable must receive optimized photo data.',
);

need(
  repository.includes(
    'fileName: preparedFile.name',
  )
    && repository.includes(
      'contentType: preparedFile.type',
    ),
  'Optimized filename/content-type is not sent.',
);

need(
  !repository.includes(
    'Item photo must be smaller than 5 MB.',
  ),
  'Legacy frontend 5 MB limit remains.',
);

const uploadStart = functions.indexOf(
  'export const uploadSmePosItemPhoto = onCall',
);

const uploadEnd = functions.indexOf(
  'export const getSmePosItemPhotoUrl = onCall',
  uploadStart,
);

need(
  uploadStart >= 0
    && uploadEnd > uploadStart,
  'Backend photo upload callable missing.',
);

const upload = functions.slice(
  uploadStart,
  uploadEnd,
);

need(
  upload.includes(
    'encoded.length > 11_200_000',
  ),
  'Backend base64 ceiling is not 8 MB compatible.',
);

need(
  upload.includes(
    'bytes.length > 8 * 1024 * 1024',
  ),
  'Backend binary photo ceiling is not 8 MB.',
);

need(
  upload.includes(
    'Optimized item photo must be smaller than 8 MB.',
  ),
  'Backend optimized-photo error message missing.',
);

need(
  upload.includes("'owner'")
    && upload.includes("'manager'")
    && upload.includes("'cashier'")
    && upload.includes("'stock_staff'")
    && upload.includes("'seller'"),
  'Photo role coverage changed unexpectedly.',
);

need(
  upload.includes(
    'requireSellerPhotoManagement',
  ),
  'Seller inventory-management protection changed.',
);

console.log(
  `SME POS mobile camera photo optimization checks passed (${checks} checks).`,
);
