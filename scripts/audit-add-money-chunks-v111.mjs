#!/usr/bin/env node
/** Measure emitted lazy module and static dependency closure, not real-user speed. */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const manifestPath = 'dist/.vite/manifest.json';
assert(fs.existsSync(manifestPath), 'Build staging first (npm run build:staging)');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entries = Object.entries(manifest);
const find = suffix => entries.find(([name, entry]) => {
  if (name.endsWith(suffix)) return true;

  // Vite may emit shared modules with generated manifest keys.
  const moduleName = suffix
    .split('/')
    .pop()
    .replace(/\.tsx$/, '');

  return typeof entry.file === 'string'
    && entry.file.split('/').pop().startsWith(moduleName + '-')
    && entry.file.endsWith('.js');
});
const modal = find('/MoneyActivityModalV111.tsx');
const transactions = find('/TransactionsPage.tsx');
const dashboard = find('/DashboardPage.tsx');
assert(modal && transactions && dashboard, 'Expected separate modal, transactions and dashboard manifest entries');
assert(modal[1].file !== transactions[1].file, 'Money modal was merged back into Transactions page');
const total = new Set();
function closure(key, seen = new Set()) {
  if (seen.has(key)) return seen;
  seen.add(key);
  const entry = manifest[key];
  assert(entry, `Unresolved build chunk ${key}`);
  if (entry.file?.endsWith('.js')) total.add(entry.file);
  for (const next of entry.imports || []) closure(next, seen);
  return seen;
}
function report(label, entry) {
  total.clear();
  closure(entry[0]);
  const chunks = [...total].map(f => {
    const bytes = fs.readFileSync(path.join('dist', f));
    return {name:f, raw:bytes.byteLength, gzip:gzipSync(bytes).byteLength};
  }).sort((a,b)=>b.gzip-a.gzip);
  const gzip = chunks.reduce((x,c)=>x+c.gzip,0);
  const fmt = n => (n/1024).toFixed(1);
  console.log(`${label}: ${fmt(gzip)} KiB gzip static-JS closure, ${chunks.length} JS files`);
  chunks.slice(0,6).forEach(x=>console.log(`  ${fmt(x.gzip).padStart(7)} KiB  ${x.name}`));
  return {gzipBytes:gzip,chunks};
}
console.log('BAJETBN PHASE 11.1 STAGING BUNDLE AUDIT');
const dashboardReport = report('Dashboard route',dashboard);
const moneyReport = report('Isolated Add Money modal',modal);
const transactionReport = report('Full Transactions route',transactions);
console.log(`Standalone modal chunk: ${modal[1].file}`);
console.log(`Transactions page chunk: ${transactions[1].file}`);
console.log('Closures include shared dependencies, so do not add these totals together.');
console.log('Compare equivalent baseline manifest and use Chrome Network/Performance on the same device for real load times.');
if(process.argv.includes('--json')) {
 const out = process.argv[process.argv.indexOf('--json')+1];
 assert(out, 'Missing --json path');
 fs.writeFileSync(out, JSON.stringify({version:'11.1',dashboard:dashboardReport,modal:moneyReport,transactions:transactionReport},null,2));
 console.log(`Saved report: ${out}`);
}
