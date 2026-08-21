import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const component = read('src/features/spaces/CollectionCommandCentre.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const inventory = read('src/features/collection/CollectionInventoryPage.tsx');
const app = read('src/app/App.tsx');
const styles = read('src/styles/global.css');
const packageJson = JSON.parse(read('package.json'));

let checks = 0;

function need(value, message) {
  checks += 1;
  assert.equal(Boolean(value), true, message);
}

for (const token of [
  'Collection v2',
  'Collection home',
  'Collection Inventory remains the source of truth.',
  'Active items',
  'Total units',
  'Barcoded',
  'With photo',
  'Groups',
  'Needs setup',
  'Recently added',
  '+ Add item',
  'Scan / find item',
  'Open Collection',
  'collectionBarcode',
  'collectionHasPhoto',
  'collectionQuantity',
]) {
  need(component.includes(token), `Missing Collection v2 marker: ${token}`);
}

need(
  component.includes('__LOADER__') === false
    && component.includes('__LOADER_CALL__') === false,
  'Collection installer placeholders remain.',
);

need(
  !component.includes('button primary'),
  'Collection command centre must not create a competing primary action.',
);

need(
  !/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(component),
  'Collection command centre must not use browser confirm/alert.',
);

need(
  details.includes(
    "import { CollectionCommandCentre } from './CollectionCommandCentre';",
  ),
  'Space Details must import CollectionCommandCentre.',
);

need(
  details.includes(
    "activeTab === 'overview' && space.type === 'collection'",
  )
    && details.includes('<CollectionCommandCentre space={space} />'),
  'Collection command centre must render only on Collection overview.',
);

need(
  inventory.includes('BarcodeCameraScanner')
    && inventory.includes('Find with camera')
    && inventory.includes('Active collection'),
  'Existing Collection inventory/scanner must remain intact.',
);

for (const route of [
  'spaces/:spaceId/collection',
  'spaces/:spaceId/collection/add',
  'spaces/:spaceId/collection/items/:itemId',
]) {
  need(app.includes(route), `Existing Collection route missing: ${route}`);
}

need(
  styles.includes('/* Collection v2 Slice 1 - command centre */')
    && styles.includes('.collection-command-recent-list'),
  'Collection v2 styles are missing.',
);

need(
  String(packageJson.scripts?.['verify:all-structural'] || '')
    .includes('verify-collection-v2-command-centre.mjs'),
  'Collection v2 verifier is not registered.',
);

console.log(
  `Collection v2 command centre checks passed (${checks} checks).`,
);
