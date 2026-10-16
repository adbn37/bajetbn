#!/usr/bin/env node
/** Static Phase 10.5 release gate; runtime visual tests still required. */
import fs from 'node:fs';
import { strict as assert } from 'node:assert';

const load = (name) => fs.readFileSync(name, 'utf8');
const shell = load('src/layouts/AppShell.tsx');
const home = load('src/pages/DashboardPage.tsx');
const icon = load('src/components/RecentActivityIcon.tsx');
const styles = load('src/styles/design-mobile-nav-activity-v105.css');
const main = load('src/main.tsx');
const tx = load('src/features/transactions/TransactionsPage.tsx');

const tabs = {
  Home: '/category-icons-v102/home.svg',
  Transactions: '/navigation-icons-v104/activity.svg',
  Add: '/navigation-icons-v104/add.svg',
  Goals: '/category-icons-v102/target.svg',
  More: '/navigation-icons-v105/more.svg',
};
for (const [label, url] of Object.entries(tabs)) {
  assert(shell.includes(`<img src="${url}" alt="" decoding="async" />`), `Bottom ${label} icon missing`);
  const path = 'public' + url;
  assert(fs.existsSync(path), `Asset missing: ${path}`);
  assert(load(path).includes('<svg'), `Invalid icon artwork: ${path}`);
  assert(shell.includes(`<small>${label}</small>`), `Tab label lost: ${label}`);
}
for (const original of ['to="/transactions"', 'to="/goals"', 'to="/more"', "onClick={() => navigate('/?quick=1')}", 'aria-label="Quick navigation"']) {
  assert(shell.includes(original), `Navigation action lost: ${original}`);
}
assert((shell.match(/className="bajetbn-v105-bottom-icon"/g) || []).length === 5, 'Five bottom icons required');
assert(home.includes('<RecentActivityIcon transaction={transaction} ownerId={user?.uid || \'\'} />'), 'Recent Activity not wired');
assert(!home.includes('categoryIconGlyph('), 'Home is still using old glyphs');
assert(icon.includes('getCategoryCustomIcon'), 'Uploaded custom category icons not preserved');
assert(icon.includes('CATEGORY_VISUAL_EVENT'), 'Live category image update event missing');
assert(icon.indexOf('{customIcon ? (') < icon.indexOf(') : src ? ('), 'Custom images must take priority');
assert(icon.includes('categoryIconAsset(key)'), 'Built-in category SVG fallback missing');
assert(icon.includes("categoryIconGlyph(key)"), 'Unknown icon fallback missing');
assert(!icon.includes("from '../features/transactions"), 'Recent Activity must not load the full transaction feature');
assert(tx.includes('function CategoryIconVisual(') && tx.includes('bajetbn-v102-neon-icon'), 'Transaction-list Phase 10.2 assets altered');
assert(styles.includes('.mobile-bottom-nav') && styles.includes('.bajetbn-v105-activity-art'), 'Icon CSS incomplete');
assert(main.includes("import './styles/design-mobile-nav-activity-v105.css';"), 'CSS import missing');
assert(load('config/deployment-environments.json').includes('"staging"'), 'Deployment policy missing');
console.log('PHASE 10.5 ICON VERIFICATION: PASS (5 mobile tabs, Recent Activity, 5 asset lookups, upload precedence, route invariants).');
console.log('NOTE: Static checks only. Confirm touch actions, light/dark rendering, and mobile layout in staging.');
