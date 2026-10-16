/** Staging gate for Phase 10.4 visual-only Home and More SVG icon refresh. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const text=(p)=>fs.readFileSync(p,'utf8');
const dashboard=text('src/pages/DashboardPage.tsx');
const more=text('src/pages/MorePage.tsx');
const home=text('src/components/HomeShortcutSymbol.tsx');
const mapping=text('src/services/navigationIconAssets.ts');
const main=text('src/main.tsx');
const css=text('src/styles/design-navigation-icons-v104.css');
assert.match(dashboard,/navigationIconSrc\('add'\)/);
assert.match(dashboard,/navigationIconSrc\('move'\)/);
assert.match(dashboard,/navigationIconSrc\('activity'\)/);
assert.match(dashboard,/onClick=\{\(\) => void openQuickActivity\('activity'\)\}/);
assert.match(dashboard,/onClick=\{\(\) => void openQuickActivity\('move'\)\}/);
assert.match(dashboard,/onClick=\{\(\) =>\s*setShowTripPicker\(true\)/);
assert.match(dashboard,/HomeShortcutSymbol id=\{shortcut.id\}/);
assert.match(more,/src=\{navigationIconSrc\(name\)\}/);
assert.match(more,/function ShortcutGrid\(/);
assert.match(more,/onClick=\{\(\) => void logOut\(\)\}/);
assert.match(home,/navigationIconSrc\(id\)/);
assert.match(main,/design-navigation-icons-v104\.css/);
assert.match(css,/bajetbn-v104-navigation-art/);
const allNames=[
 'trips','bills','receipt','budgets','recurring','subscription','accounts','reports','debt','goals','inbox',
 'spaces','calendar','search','documents','settings','plus','logout','add','move','activity',
];
const routes=['/accounts','/bills','/budgets','/goals','/recurring','/reports','/spaces','/calendar','/search','/documents','/settings','/subscription'];
for (const route of routes) assert.ok(more.includes(`to: '${route}'`), `More route changed or missing: ${route}`);
let assetsChecked=0;
for(const name of allNames){
  const match=mapping.match(new RegExp(`^  "${name}": "([^\"]+)",$`,'m'));
  assert.ok(match,`Missing mapping for ${name}`);
  const val=match[1];
  const file=val.startsWith('nav:')
    ? path.join('public/navigation-icons-v104',val.slice(4)+'.svg')
    : path.join('public/category-icons-v102',val+'.svg');
  assert.ok(fs.existsSync(file),`Missing artwork for ${name}: ${file}`);
  const svg=text(file);
  assert.match(svg,/^<svg\b/);
  assert.match(svg,/<\/svg>\s*$/);
  assert.ok(svg.length>500,`Unexpectedly small SVG: ${file}`);
  assetsChecked++;
}
const navigationDir='public/navigation-icons-v104';
const files=fs.readdirSync(navigationDir).filter(f=>f.endsWith('.svg'));
assert.equal(files.length,9,'The Phase 10.4 pack must contain exactly 9 new SVG assets.');
console.log(`PHASE 10.4 NAVIGATION ICONS: PASS (${allNames.length} mappings, ${files.length} new SVGs, ${assetsChecked} asset lookups).`);
console.log('NOTE: This is a static check; verify visual appearance, lazy-loading, quick actions and routing in staging.');
