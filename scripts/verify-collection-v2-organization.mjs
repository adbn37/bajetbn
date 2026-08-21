import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const organizer = read(
  'src/features/collection/CollectionOrganizationPage.tsx',
);
const inventory = read(
  'src/features/collection/CollectionInventoryPage.tsx',
);
const repository = read(
  'src/repositories/collectionRepository.ts',
);
const app = read('src/app/App.tsx');
const styles = read('src/styles/global.css');
const packageJson = JSON.parse(read('package.json'));

let checks = 0;

function need(value, message) {
  checks += 1;
  assert.equal(Boolean(value), true, message);
}

for (const marker of [
  'Organize Collection',
  'LifecycleFilter',
  "'active' | 'archived' | 'all'",
  'SortMode',
  "'recent' | 'name' | 'quantity'",
  'Item status',
  'Condition',
  'Group',
  'Recently added',
  'Highest quantity',
  'Reset organizer',
  'isArchived',
  'quantityOf',
  'conditionOf',
  'groupOf',
]) {
  need(
    organizer.includes(marker),
    `Organizer missing: ${marker}`,
  );
}

need(
  repository.includes(
    'export async function listCollectionItems',
  ),
  'Organizer must reuse existing Collection repository.',
);

need(
  inventory.includes(
    'to={`/spaces/${spaceId}/collection/organize`}',
  )
    && inventory.includes('Organize Collection'),
  'Existing Collection inventory must expose organizer.',
);

need(
  inventory.includes('Find with camera')
    && inventory.includes('Active collection')
    && inventory.includes('Archived items'),
  'Existing Collection scanning/lifecycle UI must remain.',
);

need(
  app.includes(
    "const CollectionOrganizationPage = lazy(",
  )
    && app.includes(
      'path="spaces/:spaceId/collection/organize"',
    ),
  'Organizer route must be registered.',
);

need(
  organizer.includes(
    'to={`/spaces/${spaceId}/collection/items/${item.id}`}',
  ),
  'Organizer must open existing item details.',
);

need(
  !/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(organizer),
  'Organizer must not use browser-native confirm/alert.',
);

need(
  styles.includes(
    '/* Collection v2 Slice 2 - organization */',
  )
    && styles.includes('.collection-organizer-entry')
    && styles.includes('.collection-organizer-grid'),
  'Organizer styles are missing.',
);

need(
  String(packageJson.scripts?.['verify:all-structural'] || '')
    .includes('verify-collection-v2-organization.mjs'),
  'Organizer verifier is not registered.',
);

console.log(
  `Collection v2 organization checks passed (${checks} checks).`,
);
