#!/usr/bin/env node
/** Read-only build analysis. Do not confuse a build artifact measurement with real device timings. */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { strict as assert } from 'node:assert';
const assets = path.resolve('dist/assets');
assert(fs.existsSync(assets), 'Run npm run build:staging first.');
const js = fs.readdirSync(assets).filter(f=>f.endsWith('.js')).map(name=>{
  const bytes=fs.readFileSync(path.join(assets,name));
  return {name, raw:bytes.byteLength, gzip:gzipSync(bytes).byteLength};
}).sort((a,b)=>b.gzip-a.gzip);
const css=fs.readdirSync(assets).filter(f=>f.endsWith('.css')).map(name=>{
  const bytes=fs.readFileSync(path.join(assets,name));
  return {name, raw:bytes.byteLength,gzip:gzipSync(bytes).byteLength};
});
assert(js.length>0,'No JavaScript emitted');
const kb=n=>(n/1024).toFixed(1);
console.log(`Phase 10.9 artifact audit — ${js.length} JS chunks, ${css.length} CSS assets`);
console.log(`Total JS (ALL chunks, not initial transfer): raw ${kb(js.reduce((a,b)=>a+b.raw,0))} KiB, gzip ${kb(js.reduce((a,b)=>a+b.gzip,0))} KiB`);
console.log(`Total CSS: gzip ${kb(css.reduce((a,b)=>a+b.gzip,0))} KiB`);
console.log('Top 15 JS assets by gzip:');
for (const f of js.slice(0,15)) console.log(`  ${kb(f.gzip).padStart(8)} KiB  ${f.name}`);
const business=js.filter(f=>/^(BusinessHomePage|BusinessReportsWorkspace|MarketplaceConsignmentPosWorkspace|StandardPosWorkspace|AdbnTech.*Workspace|AccountsPage|CommitmentsPage)-/.test(f.name));
console.log('Business-related lazy chunk candidates:');
for(const f of business) console.log(`  ${kb(f.gzip).padStart(8)} KiB  ${f.name}`);
if(!business.some(f=>f.name.startsWith('BusinessHomePage-')))
  console.log('Note: Bundler may rename or combine BusinessHomePage; inspect Vite chunk output.');
const html=fs.readFileSync('dist/index.html','utf8');
const initialAssets=[...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(m=>m[1]);
console.log('Direct HTML critical assets: '+initialAssets.join(', '));
console.log('Compare cold and warm browser load using DevTools. This report is not a latency benchmark.');
