import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(message); };
const need = (file, text) => {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing ${file}`);
  if (!read(file).includes(text)) fail(`Expected ${file} to contain: ${text}`);
};

const release = JSON.parse(read('release.json'));
const pkg = JSON.parse(read('package.json'));
if (release.version !== pkg.version) fail('package.json and release.json must match.');
const [major, minor, patch] = release.version.split('.').map(Number);
if (major !== 0 || minor !== 11 || patch < 14) fail('Standard POS requires v0.11.14 or later.');

for (const file of [
  'STANDARD_POS_ALPHA.md',
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/SmePosSettingsPage.tsx',
  'src/features/sme-pos/SmePosArchivedRecordsPage.tsx',
]) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing ${file}`);
}

for (const text of [
  'Open Register',
  'Physical product',
  'Service or unlimited item',
  'Out of stock',
  'My recent sales',
  'Update stock',
  'Complete sale',
]) need('src/features/sme-pos/StandardPosWorkspace.tsx', text);

for (const text of [
  'Owner settings',
  'POS Settings',
  'How staff use the POS',
  'POS access',
]) need('src/features/sme-pos/SmePosSettingsPage.tsx', text);

for (const text of [
  'getSmePosStaffWorkspace',
  'updateSmePosProductStock',
  'checkoutStandardPos',
  'listSmePosSales',
]) need('src/repositories/smePosRepository.ts', text);

for (const text of [
  'export const getSmePosStaffWorkspace',
  'export const updateSmePosProductStock',
  'export const checkoutStandardPos',
  'is out of stock',
  'only has ${available} available',
  "entryType: 'sme_pos_sale'",
  "categoryId: salesCategory.id",
  "returnStatus: 'not_returned'",
]) need('functions/src/index.ts', text);

need('src/app/App.tsx', 'spaces/:spaceId/pos/settings');
need('src/app/App.tsx', 'spaces/:spaceId/pos/archived');
need('firestore.rules', 'function hasPosRole');
need('firestore.rules', "hasPosRole(resource.data.spaceId, ['manager'])");
need('firestore.rules', 'match /smePosSales/{saleId}');
need('STANDARD_POS_ALPHA.md', 'staff-facing POS workspace');
need('STAGING_TEST_CHECKLIST.md', 'Standard POS Alpha 2');

const workspace = read('src/features/sme-pos/StandardPosWorkspace.tsx');
if (workspace.includes('Track stock quantity')) fail('Alpha 2 must use the explicit physical versus unlimited item choice instead of the old stock checkbox.');
if (!workspace.includes("const canViewReports = ['owner', 'manager'].includes(role)")) fail('Profit reports must remain owner/manager only.');
if (!workspace.includes("if (role === 'cashier') return ['register', 'customers', 'sales']")) fail('Cashier navigation must be limited to Register, Customers and My recent sales.');

const settingsPage = read('src/features/sme-pos/SmePosSettingsPage.tsx');
if (!settingsPage.includes('Only the SME Space owner can change shop settings and staff POS roles.')) fail('POS settings must be owner-only.');

const rules = read('firestore.rules');
if (rules.includes("allow read: if isSpaceOwner(resource.data.spaceId) || hasActivePosAccess(resource.data.spaceId);\n      allow create, update, delete: if false;\n    }\n\n    match /smePosCustomers")) fail('Lower POS roles must not retain direct full product reads.');

const scope = JSON.parse(read('scope/pre-v1-scope.json'));
const item = scope.items.find((entry) => entry.id === 'sme.standard_pos');
if (!['manual_test', 'complete'].includes(item?.status)) fail('sme.standard_pos must be manual_test or complete.');

for (const file of [
  'src/features/sme-pos/SmePosPage.tsx',
  'src/features/sme-pos/SmePosSettingsPage.tsx',
  'src/features/sme-pos/StandardPosWorkspace.tsx',
  'src/features/sme-pos/SmePosArchivedRecordsPage.tsx',
]) {
  if (/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(read(file))) fail(`${file} must not use native confirm or alert.`);
}

console.log('Standard POS Alpha 2 checks passed (staff register, owner settings, hard stock guard, role-filtered data and reports).');
