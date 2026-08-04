import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };
const requireFile = (file) => { if (!exists(file)) fail(`Missing ${file}`); };
const requireText = (file, token) => {
  requireFile(file);
  if (!read(file).includes(token)) fail(`Expected ${file} to contain: ${token}`);
};

const release = JSON.parse(read('release.json'));
const packageJson = JSON.parse(read('package.json'));
if (packageJson.version !== release.version) fail('package.json and release.json must match.');
const [major, minor, patch] = release.version.split('.').map(Number);
if (major !== 0 || minor !== 11 || patch < 13) fail('SME POS foundation requires v0.11.13 or later.');

requireFile('SME_POS_FOUNDATION_ALPHA.md');
requireFile('src/features/sme-pos/SmePosPage.tsx');
requireFile('src/features/sme-pos/SmePosSettingsPage.tsx');
requireFile('src/repositories/smePosRepository.ts');

requireText('src/types/models.ts', "export type SmePosMode = 'standard' | 'marketplace_consignment'");
requireText('src/types/models.ts', "export type SmePosRole = 'owner' | 'manager' | 'cashier' | 'stock_staff' | 'seller' | 'viewer'");
requireText('src/app/App.tsx', 'spaces/:spaceId/pos');
requireText('src/features/spaces/SpaceDetailsPage.tsx', 'Point of sale');
requireText('src/features/spaces/SpaceDetailsPage.tsx', 'Marketplace Consignment POS');

const page = read('src/features/sme-pos/SmePosPage.tsx') + '\n' + read('src/features/sme-pos/SmePosSettingsPage.tsx');
for (const token of [
  'Standard POS',
  'Marketplace Consignment POS',
  'Default payment account',
  'Activate POS',
  'Pause POS',
  'Resume POS',
  'POS access',
  'Seller access appears after upgrading',
  'Connect to the internet to change POS settings or staff access.',
]) {
  if (!page.includes(token)) fail(`SME POS page is missing: ${token}`);
}
if (/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(page)) fail('SME POS page must use BajetBN dialogs, not browser confirm/alert.');

const repository = read('src/repositories/smePosRepository.ts');
for (const token of ['saveSmePosSetup', 'setSmePosStatus', 'setSmePosAccessRole', 'getSmePosUsageCounts']) {
  if (!repository.includes(token)) fail(`SME POS repository is missing ${token}.`);
}

const functions = read('functions/src/index.ts');
for (const token of [
  'export const saveSmePosSetup',
  'export const setSmePosStatus',
  'export const setSmePosAccessRole',
  'hasMarketplacePosRecords',
  "existing?.mode === 'marketplace_consignment' && mode === 'standard'",
  "transaction.update(posSettingsRef, { ownerId: newOwnerUid",
  "role: 'owner'",
]) {
  if (!functions.includes(token)) fail(`Firebase Functions are missing POS foundation token: ${token}`);
}

const rules = read('firestore.rules');
for (const token of [
  'match /smePosSettings/{spaceId}',
  'match /smePosAccess/{accessId}',
  'match /smePosProducts/{productId}',
  'match /smePosCustomers/{customerId}',
  'match /smePosSellers/{sellerId}',
  'match /smePosListings/{listingId}',
  'match /smePosSales/{saleId}',
  'match /smePosPayouts/{payoutId}',
  'allow create, update, delete: if false;',
]) {
  if (!rules.includes(token)) fail(`Firestore rules are missing POS foundation token: ${token}`);
}

const scope = JSON.parse(read('scope/pre-v1-scope.json'));
const byId = new Map(scope.items.map((item) => [item.id, item]));
if (byId.get('sme.pos_foundation')?.status !== 'complete') fail('sme.pos_foundation must be complete.');
if (!['partial', 'manual_test', 'complete'].includes(byId.get('sme.standard_pos')?.status)) fail('sme.standard_pos must remain tracked.');
if (byId.get('sme.marketplace_pos')?.status !== 'partial') fail('sme.marketplace_pos must remain partial until seller sales are implemented.');
if (byId.get('sme.pos_returns_payouts')?.status !== 'missing') fail('Returns and payouts must remain an explicit open item.');
if (byId.get('sme.shop_pilot')?.gate !== 'pre_production') fail('The shop pilot must block production.');

requireText('PRODUCTION_READINESS_GATE.md', 'Added production blocker — SME POS');
requireText('PRE_V1_SCOPE_ROADMAP.md', 'v0.11.14 — Standard POS');
requireText('STAGING_TEST_CHECKLIST.md', 'v0.11.13 — SME POS Foundation Alpha 1');

console.log('SME POS foundation checks passed (mode choice, owner setup, safe changes, roles, rules and pre-live scope gate).');
