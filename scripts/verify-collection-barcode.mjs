import fs from 'node:fs';

let checks = 0;
function fail(message) { throw new Error(message); }
function read(file) { if (!fs.existsSync(file)) fail(`Missing ${file}`); return fs.readFileSync(file, 'utf8'); }
function requireText(file, value) { checks += 1; if (!read(file).includes(value)) fail(`Missing required text in ${file}: ${value}`); }
function rejectText(file, pattern, message) { checks += 1; if (pattern.test(read(file))) fail(message); }

const requiredFiles = [
  'COLLECTION_BARCODE_ALPHA.md',
  'COLLECTION_DETAILS_HISTORY_ALPHA.md',
  'src/components/BarcodeCameraScanner.tsx',
  'src/features/collection/CollectionInventoryPage.tsx',
  'src/features/collection/CollectionItemDetailsPage.tsx',
  'src/repositories/collectionRepository.ts',
  'scripts/verify-collection-barcode.mjs',
];
for (const file of requiredFiles) { checks += 1; if (!fs.existsSync(file)) fail(`Missing ${file}`); }

const packageJson = JSON.parse(read('package.json'));
const release = JSON.parse(read('release.json'));
checks += 5;
if (packageJson.version !== '1.2.0' || release.version !== '1.2.0') fail('Expected package.json and release.json version 1.2.0.');
if (packageJson.dependencies?.['@zxing/browser'] !== '0.2.1') fail('Expected exact @zxing/browser 0.2.1.');
if (packageJson.dependencies?.['@zxing/library'] !== '0.23.0') fail('Expected exact @zxing/library 0.23.0.');
if (packageJson.dependencies?.['@bwip-js/browser'] !== '4.11.2') fail('Expected exact @bwip-js/browser 4.11.2.');
if (!packageJson.scripts?.['verify:all-structural']?.includes('verify-collection-barcode.mjs')) fail('Collection verifier is not part of verify:all-structural.');

requireText('src/types/models.ts', "export type SpaceType = 'personal' | 'household' | 'sme' | 'trip' | 'goal' | 'collection' | 'custom';");
requireText('src/types/models.ts', 'export interface CollectionItem');
requireText('src/types/models.ts', 'export interface CollectionQuantityMovement');
requireText('src/app/App.tsx', 'CollectionItemDetailsPage');
requireText('src/app/App.tsx', 'spaces/:spaceId/collection/items/:itemId');
requireText('src/features/spaces/SpacesPage.tsx', '<option value="collection">Collection</option>');
requireText('src/features/spaces/SpaceDetailsPage.tsx', 'Open collection');
requireText('src/components/BarcodeCameraScanner.tsx', 'BrowserMultiFormatReader');
rejectText('src/features/collection/CollectionInventoryPage.tsx', /BrowserMultiFormatReader/, 'Collection page must use the shared camera scanner.');
requireText('src/features/collection/CollectionInventoryPage.tsx', 'BarcodeCameraScanner');
requireText('src/features/collection/CollectionInventoryPage.tsx', "bcid: 'code128'");
requireText('src/features/collection/CollectionInventoryPage.tsx', "bcid: 'qrcode'");
requireText('src/features/collection/CollectionInventoryPage.tsx', 'Print batch labels');
requireText('src/features/collection/CollectionItemDetailsPage.tsx', 'Quantity activity');
requireText('src/features/collection/CollectionItemDetailsPage.tsx', 'Adjust quantity');
requireText('src/repositories/collectionRepository.ts', "collection(db, 'collectionItems')");
requireText('src/repositories/collectionRepository.ts', "collection(db, 'collectionItemMovements')");
requireText('src/repositories/collectionRepository.ts', 'runTransaction');
requireText('src/repositories/collectionRepository.ts', 'adjustCollectionItemQuantity');
requireText('src/repositories/collectionRepository.ts', 'archiveCollectionItem');
requireText('src/repositories/collectionRepository.ts', 'restoreCollectionItem');
rejectText('src/repositories/collectionRepository.ts', /deleteDoc\s*\(/, 'Collection records must use archive/restore and immutable history.');

requireText('firestore.rules', 'function validCollectionMovement(data)');
requireText('firestore.rules', 'function validQuantityUpdate(itemId, before, after)');
requireText('firestore.rules', 'match /collectionItemMovements/{movementId}');
requireText('firestore.indexes.json', 'collectionItemMovements');
requireText('functions/src/index.ts', "db.collection('collectionItemMovements').where('spaceId', '==', spaceId)");
requireText('functions/src/index.ts', "'collectionItems', 'collectionItemMovements', 'smePosAccess'");
requireText('functions/src/index.ts', "collectionName: 'collectionItemMovements', field: 'createdBy'");
requireText('src/repositories/releaseCandidateRepository.ts', "rowsForValues('collectionItemMovements', 'spaceId', activeSpaceIds)");
requireText('src/repositories/releaseCandidateRepository.ts', 'collectionItemMovements,');

console.log(`Collection details and barcode verification passed (${checks} checks).`);
