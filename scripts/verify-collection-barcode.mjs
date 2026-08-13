import fs from 'node:fs';

let checks = 0;
function fail(message) { throw new Error(message); }
function read(file) { if (!fs.existsSync(file)) fail(`Missing ${file}`); return fs.readFileSync(file, 'utf8'); }
function requireText(file, value) { checks += 1; if (!read(file).includes(value)) fail(`Missing required text in ${file}: ${value}`); }
function rejectText(file, pattern, message) { checks += 1; if (pattern.test(read(file))) fail(message); }

const requiredFiles = [
  'COLLECTION_BARCODE_ALPHA.md',
  'src/features/collection/CollectionInventoryPage.tsx',
  'src/repositories/collectionRepository.ts',
  'scripts/verify-collection-barcode.mjs',
];
for (const file of requiredFiles) { checks += 1; if (!fs.existsSync(file)) fail(`Missing ${file}`); }

const packageJson = JSON.parse(read('package.json'));
const release = JSON.parse(read('release.json'));
checks += 5;
if (packageJson.version !== '1.1.0' || release.version !== '1.1.0') fail('Expected package.json and release.json version 1.1.0.');
if (packageJson.dependencies?.['@zxing/browser'] !== '0.1.5') fail('Expected exact @zxing/browser 0.1.5.');
if (packageJson.dependencies?.['@zxing/library'] !== '0.21.3') fail('Expected exact @zxing/library 0.21.3.');
if (packageJson.dependencies?.['@bwip-js/browser'] !== '4.11.2') fail('Expected exact @bwip-js/browser 4.11.2.');
if (!packageJson.scripts?.['verify:all-structural']?.includes('verify-collection-barcode.mjs')) fail('Collection verifier is not part of verify:all-structural.');

requireText('src/types/models.ts', "export type SpaceType = 'personal' | 'household' | 'sme' | 'trip' | 'goal' | 'collection' | 'custom';");
requireText('src/types/models.ts', 'export interface CollectionItem');
requireText('src/app/App.tsx', 'CollectionInventoryPage');
requireText('src/app/App.tsx', 'spaces/:spaceId/collection');
requireText('src/features/spaces/SpacesPage.tsx', '<option value="collection">Collection</option>');
requireText('src/features/spaces/SpaceDetailsPage.tsx', 'Open collection');
requireText('src/features/collection/CollectionInventoryPage.tsx', 'BrowserMultiFormatReader');
requireText('src/features/collection/CollectionInventoryPage.tsx', "bcid: 'code128'");
requireText('src/features/collection/CollectionInventoryPage.tsx', "bcid: 'qrcode'");
requireText('src/features/collection/CollectionInventoryPage.tsx', 'Print batch labels');
requireText('src/repositories/collectionRepository.ts', "collection(db, 'collectionItems')");
requireText('src/repositories/collectionRepository.ts', "where('barcodes', 'array-contains', value)");
requireText('src/repositories/collectionRepository.ts', 'archiveCollectionItem');
requireText('src/repositories/collectionRepository.ts', 'restoreCollectionItem');
rejectText('src/repositories/collectionRepository.ts', /deleteDoc\s*\(/, 'Collection items must use archive/restore instead of direct deletion.');

requireText('firestore.rules', 'function canEditCollection(spaceId)');
requireText('firestore.rules', 'match /collectionItems/{itemId}');
requireText('firestore.rules', "get(/databases/$(database)/documents/spaces/$(spaceId)).data.type == 'collection'");
requireText('firestore.indexes.json', 'collectionItems');
requireText('firestore.indexes.json', 'arrayConfig');
requireText('functions/src/index.ts', "db.collection('collectionItems').where('spaceId', '==', spaceId)");
requireText('functions/src/index.ts', "'collectionItems', 'smePosAccess'");
requireText('functions/src/index.ts', "collectionName: 'collectionItems', field: 'createdBy'");
requireText('src/repositories/releaseCandidateRepository.ts', "rowsForValues('collectionItems', 'spaceId', activeSpaceIds)");
requireText('src/repositories/releaseCandidateRepository.ts', 'collectionItems,');

console.log(`Collection barcode verification passed (${checks} checks).`);
