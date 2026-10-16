/**
 * BajetBN Phase 9: source wiring and emitted-module graph sanity check.
 * Vite/Rolldown can wrap or re-export dynamic imports; do not assert that
 * DashboardPage contains one specific filename in a direct import() call.
 * No application files or financial workflows are modified by this check.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

const sourceFile = 'src/pages/DashboardPage.tsx';
const source = fs.readFileSync(sourceFile, 'utf8');
assert.match(source, /\blazy\s*\(/, 'Home lazy component declaration missing');
assert.match(source, /import\(['"]\.\.\/features\/transactions\/TransactionsPage['"]\)/, 'On-demand transaction module source import missing');
assert.doesNotMatch(source, /from\s+['"]\.\.\/features\/transactions\/TransactionsPage['"]/, 'Eager TransactionsPage source import still present');
assert.match(source, /<Suspense\b[\s\S]*?fallback=\{/, 'Suspense fallback missing');
assert.match(source, /bajetbn-v9-home-on-demand/, 'Home loading message missing');
assert.match(source, /<MoneyActivityModal\b/, 'Existing transaction modal missing');
assert.match(source, /<\/Suspense>/, 'Suspense closing tag missing');
assert.match(source, /onSubmit=\{postTransaction\}/, 'Original transaction posting callback missing');
assert.match(source, /onComplete=\{async\s*\(/, 'Original completion callback missing');
console.log('PASS: Phase 9 source wiring and existing callbacks.');

const assets = path.join('dist','assets');
if (!fs.existsSync(assets)) {
  console.log('BUILD NOT CHECKED: dist/assets is absent. Run npm run build:staging first.');
  process.exit(0);
}
const names = fs.readdirSync(assets).filter(name => name.endsWith('.js'));
const dashboard = names.find(name => /^DashboardPage-[\w-]+\.js$/.test(name));
const transactions = names.find(name => /^TransactionsPage-[\w-]+\.js$/.test(name));
assert.ok(dashboard, 'Built DashboardPage chunk not found. Rebuild staging before verifying.');
assert.ok(transactions, 'Built TransactionsPage chunk not found. Rebuild staging before verifying.');
const fileSet = new Set(names);
const cache = new Map();
function readChunk(name) {
  if (!cache.has(name)) cache.set(name, fs.readFileSync(path.join(assets,name),'utf8'));
  return cache.get(name);
}
function toLocalFile(specifier) {
  if (!specifier.startsWith('.')) return null;
  const name = path.posix.basename(specifier.split('?')[0].split('#')[0]);
  return fileSet.has(name) ? name : null;
}
function imports(name) {
  const code = readChunk(name);
  const dynamic = new Set();
  const staticImports = new Set();
  // Recognize dynamic imports including __vitePreload(() => import('./...')).
  for (const match of code.matchAll(/\bimport\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g)) {
    const target = toLocalFile(match[2]);
    if (target) dynamic.add(target);
  }
  // Vite/Rolldown compresses static imports to import{a as b}from"./foo.js".
  for (const match of code.matchAll(/\bimport\s*(?:[^'"(\n;]*?\bfrom\s*)?(['"])([^'"]+)\1/g)) {
    const target = toLocalFile(match[2]);
    if (target) staticImports.add(target);
  }
  // Re-exports (export{...}from"./chunk.js") also create eager edges.
  for (const match of code.matchAll(/\bexport\s*[^'"\n;]*?\bfrom\s*(['"])([^'"]+)\1/g)) {
    const target = toLocalFile(match[2]);
    if (target) staticImports.add(target);
  }
  return { dynamic: [...dynamic], staticImports: [...staticImports] };
}
function staticClosure(startNames) {
  const seen = new Set();
  const todo = [...startNames];
  while (todo.length) {
    const current = todo.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    todo.push(...imports(current).staticImports);
  }
  return seen;
}
const eager = staticClosure([dashboard]);
assert.ok(!eager.has(transactions), 'FAIL: Home statically imports TransactionsPage in the compiled chunk graph. Lazy-load optimization is not effective.');
const asyncRoots = new Set();
for (const name of eager) {
  for (const target of imports(name).dynamic) asyncRoots.add(target);
}
// Search a few async levels too; dynamic imports can point through helpers.
const asyncSeen = new Set();
const queue = [...asyncRoots];
while(queue.length){
  const name=queue.pop();
  if(!name || asyncSeen.has(name)) continue;
  const relatives=staticClosure([name]);
  for(const relative of relatives){
    if(asyncSeen.has(relative)) continue;
    asyncSeen.add(relative);
    queue.push(...imports(relative).dynamic);
  }
}
const content = readChunk(dashboard);
console.log(`${dashboard}: ${(Buffer.byteLength(content)/1024).toFixed(1)} KiB raw; ${(gzipSync(content).length/1024).toFixed(1)} KiB gzip.`);
console.log(`Built chunks: ${names.length}; Home synchronous dependency chunks: ${eager.size}; async dependency chunks: ${asyncSeen.size}.`);
console.log(`TransactionsPage eager dependency: NO; async dependency: ${asyncSeen.has(transactions) ? 'YES' : 'NOT CONFIRMED'}.`);
if (asyncSeen.has(transactions)) {
  console.log('PASS: Built transaction screen chunk is reached through an asynchronous import path.');
} else {
  console.log('INCONCLUSIVE: No compiled path to TransactionsPage was detected. The bundler may have rewritten the graph.');
  console.log('MANUAL GATE REQUIRED: In Chrome DevTools Network (Disable cache), refresh Personal Home and confirm TransactionsPage JS is absent until Add Money opens.');
}
console.log('NOTE: Static analysis cannot establish actual load-speed improvement. Validate browser Network and Add Money behavior before staging.');
