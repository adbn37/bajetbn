/** BajetBN Phase 10.1: source, pure logic and optional built-bundle verifier. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ui = fs.readFileSync('src/features/transactions/TransactionsPage.tsx', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const css = fs.readFileSync('src/styles/design-smart-category-v10.css', 'utf8');
for (const [re, label] of [
  [/readSmartCategoryUsage/, 'device history read'],
  [/recordSmartCategoryUsage\(user\.uid, type, scope, selectedCategory\.id\)/, 'posted-only recording'],
  [/if \(outcome\.mode === 'queued'\)/, 'queued outcomes remain distinct'],
  [/if \(outcome\.mode === 'pending_approval'\)/, 'pending approval outcomes remain distinct'],
  [/smartCategorySuggestions\(categoryOptions, smartCategoryUsage\)/, 'history suggestions'],
  [/aria-label="Search categories"/, 'accessible category search'],
  [/No categories found/, 'search empty state'],
  [/Recent on this device/, 'recent shortcut section'],
  [/Frequent on this device/, 'frequent shortcut section'],
  [/bajetbn-v8-transaction-success/, 'Phase 8 success popup preserved'],
]) assert.match(ui, re, 'Missing ' + label);
assert.match(main, /design-smart-category-v10\.css/, 'Phase 10 stylesheet not imported');
assert.match(css, /prefers-reduced-motion/, 'Reduced motion handling is missing');
console.log('PASS: Phase 10.1 UI integration and safety anchors.');

// Node 24+ supports TypeScript stripping for this side-effect-free TS helper.
if (Number(process.versions.node.split('.')[0]) >= 24) {
  const u = await import(pathToFileURL(path.resolve('src/services/smartCategoryUsage.ts')).href);
  const memory = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => memory.get(key) || null,
    setItem: (key, value) => memory.set(key, value),
  }};
  try {
    assert.deepEqual(u.readSmartCategoryUsage('alice', 'expense', 'personal'), []);
    u.recordSmartCategoryUsage('alice', 'expense', 'personal', 'food', 100);
    u.recordSmartCategoryUsage('alice', 'expense', 'personal', 'food', 200);
    u.recordSmartCategoryUsage('alice', 'expense', 'personal', 'rent', 300);
    assert.equal(u.readSmartCategoryUsage('alice', 'expense', 'personal').find(x => x.categoryId === 'food').count, 2);
    assert.deepEqual(u.readSmartCategoryUsage('alice', 'income', 'personal'), [], 'Income must be independent');
    assert.deepEqual(u.readSmartCategoryUsage('alice', 'expense', 'business'), [], 'Business must be independent');
    assert.deepEqual(u.readSmartCategoryUsage('bob', 'expense', 'personal'), [], 'Other users must be independent');
    const options = [{ id: 'rent' }, { id: 'food' }, { id: 'other' }];
    const suggestions = u.smartCategorySuggestions(options, u.readSmartCategoryUsage('alice', 'expense', 'personal'), 1);
    assert.deepEqual(suggestions.recent.map(x => x.id), ['rent']);
    assert.deepEqual(suggestions.frequent.map(x => x.id), ['food']);
    assert.deepEqual(u.smartCategorySuggestions([{ id: 'other' }], u.readSmartCategoryUsage('alice', 'expense', 'personal')).recent, []);
    window.localStorage.getItem = () => { throw new Error('Browser blocks storage'); };
    window.localStorage.setItem = () => { throw new Error('Browser blocks storage'); };
    assert.doesNotThrow(() => u.recordSmartCategoryUsage('alice', 'expense', 'personal', 'other'));
    assert.deepEqual(u.readSmartCategoryUsage('alice', 'expense', 'personal'), []);
  } finally {
    delete globalThis.window;
  }
  console.log('PASS: on-device usage scoring, user/scope isolation, blocked-storage fallback.');
} else {
  console.log('SKIP: pure usage helper tests require Node 24+, using source + TypeScript checks.');
}

const dir = path.join('dist', 'assets');
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir);
  const tx = files.find(f => /^TransactionsPage-[\w-]+\.js$/.test(f));
  const cssFile = files.find(f => /^index-[\w-]+\.css$/.test(f));
  assert.ok(tx, 'Build must have a TransactionsPage chunk');
  assert.ok(cssFile, 'Build must have the app CSS chunk');
  const compiled = fs.readFileSync(path.join(dir, tx), 'utf8');
  const builtCss = fs.readFileSync(path.join(dir, cssFile), 'utf8');
  assert.match(compiled, /Recent on this device/, 'Compiled transaction picker is missing Phase 10 recent section');
  assert.match(compiled, /Search categories/, 'Compiled transaction picker is missing search');
  assert.match(builtCss, /bajetbn-v10-category-search/, 'Compiled stylesheet is missing Phase 10 styles');
  console.log('PASS: Phase 10.1 appears in built JS and CSS.');
} else {
  console.log('Build not present: run npm run build:staging and rerun this verification.');
}
