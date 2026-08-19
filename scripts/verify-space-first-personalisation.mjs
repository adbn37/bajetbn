import { existsSync, readFileSync } from 'node:fs';

const fail = (message) => { throw new Error(message); };
const read = (path) => readFileSync(path, 'utf8');
const need = (path, token) => {
  const source = read(path);
  if (!source.includes(token)) fail(`${path} is missing: ${token}`);
};

for (const [path, tokens] of Object.entries({
  'src/features/spaces/SpaceDetailsPage.tsx': [
    'canViewSmeFinancials',
    '<SpaceActionHub',
    'canViewFinancials={canViewSmeFinancials}',
    "smePosRole === 'manager'",
  ],
  'src/features/spaces/SpaceActionHub.tsx': [
    'Quick Space actions',
    'lockedSpaceId={space.id}',
    "setTool('expenses')",
    "setTool('balances')",
    "setTool('bills')",
  ],
  'src/features/transactions/TransactionsPage.tsx': [
    'onCategoriesChanged?: () => Promise<TransactionCategory[]>;',
    'lockedSpaceId?: string;',
    'initialType?:',
    '+ Add category',
    'category-picker-legend',
    'Locked to this Space',
  ],
  'src/layouts/AppShell.tsx': [
    'SidebarCustomizer',
    'orderedNavigation',
    'subscribeSpaceActivities',
    'space-activity-live-toast',
    'Customize menu',
  ],
  'src/pages/SettingsPage.tsx': [
    'PersonalStyleSettings',
  ],
  'src/components/PersonalStyleSettings.tsx': [
    'Friendster-inspired freedom',
    'Icon style',
    'Background pattern',
  ],
  'src/components/SidebarCustomizer.tsx': [
    'Drag on desktop or use the arrows on mobile',
    'Reset menu',
  ],
  'src/services/personalisation.ts': [
    "export type IconPack = 'classic' | 'rounded' | 'minimal' | 'retro';",
    'hiddenNavigation',
    'pinnedNavigation',
    'PERSONALISATION_EVENT',
  ],
  'src/repositories/transactionRepository.ts': [
    'export async function listTransactionsForSpace',
    "where('spaceId', '==', spaceId)",
  ],
  'src/repositories/budgetRepository.ts': [
    'export async function listBudgetsForSpace',
  ],
  'src/repositories/commitmentRepository.ts': [
    'export async function listCommitmentsForSpace',
  ],
  'src/repositories/collaborationRepository.ts': [
    'export function subscribeSpaceActivities',
  ],
  'firestore.rules': [
    'function isSmeSpace(spaceId)',
    'isPosManager(resource.data.spaceId)',
    '!isSmeSpace(resource.data.spaceId)',
  ],
  'src/styles/global.css': [
    '/* v1.4.0 Space-first personalisation */',
    '.space-action-hub',
    '.menu-customizer-row',
    "html[data-wallpaper-style='dots']",
  ],
})) {
  for (const token of tokens) need(path, token);
}

const rules = read('firestore.rules');
if (!/match \/transactions\/\{transactionId\}[\s\S]*?resource\.data\.ownerId == request\.auth\.uid\s*\|\|\s*isPosManager\(resource\.data\.spaceId\)/.test(rules)) {
  fail('transactions rules do not grant SME Manager read access.');
}
if (!/match \/budgets\/\{budgetId\}[\s\S]*?resource\.data\.ownerId == request\.auth\.uid\s*\|\|\s*isPosManager\(resource\.data\.spaceId\)/.test(rules)) {
  fail('budgets rules do not grant SME Manager read access.');
}
const commitmentRule = rules.match(/match \/commitments\/\{commitmentId\}[\s\S]*?allow create, update, delete: if false;/)?.[0] || '';
if (
  !commitmentRule.includes('isPosManager(resource.data.spaceId)')
  || !commitmentRule.includes('!isSmeSpace(resource.data.spaceId)')
  || !commitmentRule.includes('isSpaceMember(resource.data.spaceId)')
) {
  fail('SME commitment privacy rule is missing.');
}

const packageJson = JSON.parse(read('package.json'));
if (packageJson.version !== '1.4.0') fail(`Expected package version 1.4.0, found ${packageJson.version}.`);

if (!existsSync('public/app-recovery.js') || !read('index.html').includes('/app-recovery.js')) {
  fail('v1.3.12 deployment recovery must remain present.');
}
need('scripts/verify-deployment-cache-recovery.mjs', 'Deployment cache recovery verifier');

if (process.argv.includes('--dist')) {
  for (const path of ['dist/index.html', 'dist/app-recovery.js', 'dist/_headers', 'dist/sw.js']) {
    if (!existsSync(path)) fail(`Built output missing: ${path}`);
  }
  const builtIndex = read('dist/index.html');
  const recoveryPos = builtIndex.indexOf('/app-recovery.js');
  const moduleMatch = [...builtIndex.matchAll(/<script\b[^>]*>/gi)].find((match) =>
    /\btype=["']module["']/i.test(match[0]) && /\bsrc=["'][^"']+["']/i.test(match[0]));
  if (recoveryPos < 0 || !moduleMatch || typeof moduleMatch.index !== 'number' || recoveryPos >= moduleMatch.index) {
    fail('Built deployment recovery is not before the Vite application module.');
  }

  // Keep build verification dependency-free: source verifier proves feature markers;
  // dist verifier protects the PWA shell/order, and Vite filenames are checked live at deploy time.
  if (!read('dist/app-recovery.js').includes('vite:preloadError')) {
    fail('Built app-recovery.js lost vite:preloadError handling.');
  }
}

console.log(`Space-first personalisation verifier: PASS${process.argv.includes('--dist') ? ' (source + dist)' : ' (source)'}.`);
