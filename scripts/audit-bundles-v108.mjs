#!/usr/bin/env node
/** Build artifact check; no external calls, no reads of user accounts/financial data. */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { strict as assert } from 'node:assert';
const root = path.resolve('dist/assets');
assert(fs.existsSync(root), 'Run npm run build:staging first (dist/assets is missing).');
const files = fs.readdirSync(root).filter(name => /\.js$/.test(name)).map(name => {
  const contents = fs.readFileSync(path.join(root,name));
  return {name, raw:contents.length, gzip:gzipSync(contents,{level:6}).length};
}).sort((a,b)=>b.gzip-a.gzip);
assert(files.length>0, 'No JavaScript assets found.');
const kb=n=>(n/1024).toFixed(1);
const count = files.reduce((x,a)=>x+a.raw,0);
const gzip = files.reduce((x,a)=>x+a.gzip,0);
console.log(`BAJETBN 10.8 BUNDLE AUDIT: ${files.length} JS assets; raw ${kb(count)} KiB, gzip ${kb(gzip)} KiB (sum of all emitted chunks, NOT first-load transfer)`);
console.log('Largest 12 JavaScript chunks (gzip KiB):');
for(const item of files.slice(0,12)) console.log(`${kb(item.gzip).padStart(8)} KiB  ${item.name}`);
console.log('Compare files and Network tab before/after; this sum is not equal to data transferred on one page.');
