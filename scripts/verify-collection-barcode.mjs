import fs from 'node:fs';

let checks = 0;
function fail(message) { throw new Error(message); }
function read(file) { if (!fs.existsSync(file)) fail(`Missing ${file}`); return fs.readFileSync(file, 'utf8'); }
function requireText(file, value) { checks += 1; if (!read(file).includes(value)) fail(`Missing required text in ${file}: ${value}`); }
function rejectText(file, pattern, message) { checks += 1; if (pattern.test(read(file))) fail(message); }

const requiredFiles = [
  'COLLECTION_BARCODE_ALPHA.md',
  'COLLECTION_DETAILS_HISTORY_ALPHA.md',
  'COLLECTION_PHOTOS_PRIMARY_BARCODE_ALPHA.md',
  'src/components/BarcodeCameraScanner.tsx',
  'src/components/CollectionItemPhoto.tsx',
  'src/features/collection/CollectionInventoryPage.tsx',
  'src/features/collection/CollectionItemDetailsPage.tsx',
  'src/repositories/collectionRepository.ts',
  'scripts/verify-collection-barcode.mjs',
];
for (const file of requiredFiles) { checks += 1; if (!fs.existsSync(file)) fail(`Missing ${file}`); }

const packageJson = JSON.parse(read('package.json'));
const release = JSON.parse(read('release.json'));
checks += 5;
const collectionVersion = String(packageJson.version).split('.').map(Number);
const collectionVersionNumber = collectionVersion[0] * 1_000_000 + collectionVersion[1] * 1_000 + collectionVersion[2];
if (
  packageJson.version !== release.version ||
  collectionVersion.length !== 3 ||
  collectionVersion.some((part) => !Number.isInteger(part) || part < 0) ||
  collectionVersionNumber < 1_002_000
) fail('Expected matching package.json and release.json versions at 1.2.0 or later.');
if (packageJson.dependencies?.['@zxing/browser'] !== '0.2.1') fail('Expected exact @zxing/browser 0.2.1.');
if (packageJson.dependencies?.['@zxing/library'] !== '0.23.0') fail('Expected exact @zxing/library 0.23.0.');
if (packageJson.dependencies?.['@bwip-js/browser'] !== '4.11.2') fail('Expected exact @bwip-js/browser 4.11.2.');
if (!packageJson.scripts?.['verify:all-structural']?.includes('verify-collection-barcode.mjs')) fail('Collection verifier is not part of verify:all-structural.');

requireText('src/types/models.ts', "export type SpaceType = 'personal' | 'household' | 'sme' | 'trip' | 'goal' | 'collection' | 'vehicle' | 'property' | 'project' | 'event' | 'asset' | 'custom';");
requireText('src/types/models.ts', 'export interface CollectionItem');
requireText('src/types/models.ts', 'export interface CollectionQuantityMovement');
requireText('src/types/models.ts', 'export interface CollectionItemPhoto');
requireText('src/types/models.ts', 'primaryBarcode?: string;');
requireText('src/types/models.ts', 'primaryPhotoId?: string | null;');
requireText('src/app/App.tsx', 'CollectionItemDetailsPage');
requireText('src/app/App.tsx', 'spaces/:spaceId/collection/items/:itemId');
const spacesPageForCollection = read('src/features/spaces/SpacesPage.tsx');
const hasCollectionSpaceOption = spacesPageForCollection.includes('<option value="collection">Collection</option>') || spacesPageForCollection.includes('<option value={"collection"}>Collection</option>');
if (!hasCollectionSpaceOption) fail('Collection must remain available as a Space type option.');
requireText('src/features/spaces/SpaceDetailsPage.tsx', 'Open collection');
requireText('src/components/BarcodeCameraScanner.tsx', 'BrowserMultiFormatReader');
rejectText('src/features/collection/CollectionInventoryPage.tsx', /BrowserMultiFormatReader/, 'Collection page must use the shared camera scanner.');
requireText('src/features/collection/CollectionInventoryPage.tsx', 'BarcodeCameraScanner');
requireText('src/features/collection/CollectionInventoryPage.tsx', "bcid: 'code128'");
requireText('src/features/collection/CollectionInventoryPage.tsx', "bcid: 'qrcode'");
requireText('src/features/collection/CollectionInventoryPage.tsx', 'Print batch labels');
requireText('src/features/collection/CollectionItemDetailsPage.tsx', 'Quantity activity');
requireText('src/features/collection/CollectionItemDetailsPage.tsx', 'Adjust quantity');
requireText('src/features/collection/CollectionItemDetailsPage.tsx', 'Take or choose photo');
requireText('src/features/collection/CollectionItemDetailsPage.tsx', 'Make primary');
requireText('src/features/collection/CollectionInventoryPage.tsx', 'Primary barcode');
requireText('src/features/collection/CollectionInventoryPage.tsx', 'Add an optional primary photo');
requireText('src/features/collection/CollectionInventoryPage.tsx', 'uploadCollectionItemPhoto');
requireText('src/components/CollectionItemPhoto.tsx', 'getCollectionItemPhotoUrl');
requireText('src/utils/collectionPhotos.ts', "canvas.toBlob");
requireText('src/utils/collectionPhotos.ts', 'createImageBitmap');
requireText('src/repositories/collectionRepository.ts', "collection(db, 'collectionItems')");
requireText('src/repositories/collectionRepository.ts', "collection(db, 'collectionItemMovements')");
requireText('src/repositories/collectionRepository.ts', 'runTransaction');
requireText('src/repositories/collectionRepository.ts', 'adjustCollectionItemQuantity');
requireText('src/repositories/collectionRepository.ts', 'archiveCollectionItem');
requireText('src/repositories/collectionRepository.ts', 'restoreCollectionItem');
requireText('src/repositories/collectionRepository.ts', 'uploadCollectionItemPhoto');
requireText('src/repositories/collectionRepository.ts', 'setPrimaryCollectionItemPhoto');
requireText('src/repositories/collectionRepository.ts', 'removeCollectionItemPhoto');
rejectText('src/repositories/collectionRepository.ts', /deleteDoc\s*\(/, 'Collection records must use archive/restore and immutable history.');

requireText('firestore.rules', 'function validCollectionMovement(data)');
requireText('firestore.rules', 'function validQuantityUpdate(itemId, before, after)');
requireText('firestore.rules', 'match /collectionItemMovements/{movementId}');
requireText('firestore.rules', "'primaryBarcode', 'photos', 'primaryPhotoId'");
requireText('storage.rules', 'match /spaces/{spaceId}/collection-items/{itemId}/{fileName}');
requireText('storage.rules', "request.resource.contentType == 'image/jpeg'");
requireText('firestore.indexes.json', 'collectionItemMovements');
requireText('functions/src/index.ts', "db.collection('collectionItemMovements').where('spaceId', '==', spaceId)");
requireText('functions/src/index.ts', "'collectionItems', 'collectionItemMovements', 'smePosAccess'");
requireText('functions/src/index.ts', "collectionName: 'collectionItemMovements', field: 'createdBy'");
requireText('src/repositories/releaseCandidateRepository.ts', "rowsForValues('collectionItemMovements', 'spaceId', activeSpaceIds)");
requireText('src/repositories/releaseCandidateRepository.ts', 'collectionItemMovements,');
const collectionExportSource = read('src/repositories/releaseCandidateRepository.ts');
const collectionExportFormat = Number((collectionExportSource.match(/formatVersion:\s*(\d+)/) || [])[1] || 0);
if (collectionExportFormat < 6) fail('Collection export format must remain version 6 or newer.');
requireText('functions/src/index.ts', 'Collection photo path');

console.log(`Collection photos, details, and barcode verification passed (${checks} checks).`);
