import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(message); };

const requiredFiles = [
  'release.json',
  'src/config/release.ts',
  'src/components/ActionConfirmModal.tsx',
  'RELEASE_SAFETY_HARDENING_ALPHA.md',
  'PRODUCTION_SMOKE_TEST_CHECKLIST.md',
  'PRODUCTION_ROLLBACK_PLAN.md',
  'FUNCTIONS_DEPENDENCY_REVIEW.md',
];
for (const file of requiredFiles) if (!exists(file)) fail(`Missing release-safety file: ${file}`);

const release = JSON.parse(read('release.json'));
const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
if (!/^\d+\.\d+\.\d+$/.test(release.version)) fail('release.json version must use x.y.z format.');
if (packageJson.version !== release.version) fail('package.json version does not match release.json.');
if (packageLock.version !== release.version || packageLock.packages?.['']?.version !== release.version) {
  fail('package-lock.json root version does not match release.json.');
}

const releaseSource = read('src/config/release.ts');
if (!releaseSource.includes("import release from '../../release.json'")) fail('Frontend release metadata is not sourced from release.json.');
if (!read('src/pages/SettingsPage.tsx').includes('appBuildLabel()')) fail('Settings does not use the shared release label.');
const swGenerator = read('scripts/generate-service-worker.mjs');
if (!swGenerator.includes("new URL('../release.json'")) fail('Service worker generator does not read release.json.');
if (/bajetbn-shell-v0\.\d/.test(swGenerator)) fail('Service worker generator still contains a hard-coded old version.');

const sourceFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'));
const forbidden = /\b(?:window\.)?(?:confirm|alert)\s*\(/;
const offenders = sourceFiles
  .filter((file) => forbidden.test(fs.readFileSync(file, 'utf8')))
  .map((file) => path.relative(root, file));
if (offenders.length) fail(`Browser-native confirmation/alert remains in: ${offenders.join(', ')}`);

const dialogUsers = [
  'src/features/transactions/TransactionsPage.tsx',
  'src/features/goals/GoalsPage.tsx',
  'src/features/spaces/SharedExpensesPanel.tsx',
  'src/features/spaces/TripMoneyPanel.tsx',
  'src/features/collaboration/CollaborationPage.tsx',
];
for (const file of dialogUsers) {
  const source = read(file);
  if (!source.includes('ActionConfirmModal')) fail(`${file} does not use the BajetBN action confirmation dialog.`);
}

const workflow = read('.github/workflows/staging-ci.yml');
if (!workflow.includes('npm run verify:all-structural')) fail('Staging CI does not run the package-level full structural suite.');
if (!packageJson.scripts?.['verify:release-safety']?.includes('verify-release-safety-hardening.mjs')) {
  fail('package.json is missing verify:release-safety.');
}
if (!packageJson.scripts?.['verify:all-structural']?.includes('verify-release-safety-hardening.mjs')) {
  fail('Release-safety checks are not part of verify:all-structural.');
}

const functionsPackage = JSON.parse(read('functions/package.json'));
const functionsLock = JSON.parse(read('functions/package-lock.json'));
if (String(functionsPackage.engines?.node) !== '22') fail('Functions runtime must remain Node.js 22 for this reviewed baseline.');
if (!functionsPackage.dependencies?.['firebase-functions']) fail('firebase-functions dependency is missing.');
if (!functionsLock.packages?.['node_modules/firebase-functions']?.version) fail('firebase-functions lockfile resolution is missing.');

const audit = JSON.parse(read('scope/pre-v1-scope.json'));
const item = (id) => audit.items.find((entry) => entry.id === id);
for (const id of ['safety.native_confirm', 'release.version_source', 'release.dependencies']) {
  if (item(id)?.status !== 'complete') fail(`${id} must be marked complete after v0.11.5 hardening.`);
}

console.log(`Release safety hardening checks passed for BajetBN v${release.version}.`);
console.log(`Checked ${sourceFiles.length} source files for browser-native confirmation and alert calls.`);
console.log(`Functions SDK lockfile version: ${functionsLock.packages['node_modules/firebase-functions'].version}.`);
