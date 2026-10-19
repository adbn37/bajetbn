#!/usr/bin/env node
/** Compute emitted first-entry JS/CSS closure from Vite manifest, not source sizes. */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const base=path.resolve('dist');
const manifestPath=path.join(base,'.vite','manifest.json');
assert(fs.existsSync(manifestPath),'Missing dist/.vite/manifest.json: run npm run build:staging first.');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const entries=Object.entries(manifest).filter(([key,value])=>value.isEntry && value.file);
assert(entries.length>0,'No Vite manifest entry was emitted');
function bytesFor(rel){const abs=path.join(base,rel);if(!fs.existsSync(abs)) throw Error('Manifest asset missing: '+rel);const raw=fs.readFileSync(abs);return {raw:raw.length,gzip:gzipSync(raw).length};}
const js=fs.readdirSync(path.join(base,'assets')).filter(x=>x.endsWith('.js')).map(name=>{const b=bytesFor('assets/'+name);return {name,...b};}).sort((a,b)=>b.gzip-a.gzip);
const css=fs.readdirSync(path.join(base,'assets')).filter(x=>x.endsWith('.css')).map(name=>{const b=bytesFor('assets/'+name);return {name,...b};}).sort((a,b)=>b.gzip-a.gzip);
function closure(key,visited=new Set()) {if(visited.has(key))return visited;visited.add(key);for(const child of manifest[key]?.imports||[])closure(child,visited);return visited;}
const initialFiles=new Set();
for(const [key] of entries){for(const k of closure(key)){const item=manifest[k];if(item?.file)initialFiles.add(item.file);for(const c of item?.css||[])initialFiles.add(c);}}
const directHtml=fs.readFileSync(path.join(base,'index.html'),'utf8');
for(const match of directHtml.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g))initialFiles.add(match[1].slice(1));
const total=(files)=>files.reduce((sum,x)=>sum+x.gzip,0);
const initRows=[...initialFiles].map(file=>({file,...bytesFor(file)}));
const fmt=n=>(n/1024).toFixed(1)+' KiB';
console.log('BAJETBN PHASE 11.0 — emitted bundle measurements (not a speed test)');
console.log('Version: '+JSON.parse(fs.readFileSync('dist/release.json','utf8')).version);
console.log('JS chunks: '+js.length+'; CSS assets: '+css.length);
console.log('Direct + statically imported entry JS/CSS: '+fmt(total(initRows))+' gzip ('+fmt(initRows.reduce((x,y)=>x+y.raw,0))+' raw)');
console.log('ALL JS chunks, including lazy routes: '+fmt(total(js))+' gzip');
console.log('ALL CSS: '+fmt(total(css))+' gzip');
console.log('INITIAL ASSETS:');
for(const f of initRows.sort((a,b)=>b.gzip-a.gzip))console.log('  '+fmt(f.gzip).padStart(12)+'  '+f.file);
console.log('HEAVIEST JAVASCRIPT CHUNKS:');
for(const f of js.slice(0,15))console.log('  '+fmt(f.gzip).padStart(12)+'  '+fmt(f.raw).padStart(12)+' raw  '+f.name);
console.log('HEAVIEST CSS CHUNKS:');
for(const f of css.slice(0,8))console.log('  '+fmt(f.gzip).padStart(12)+'  '+f.name);
const selected=['DashboardPage','GlobalBusinessOverview','TransactionsPage','GoalsPage','BusinessHomePage','framework-v110','firebase-firestore-v110','firebase-auth-v110'];
console.log('FOCUS ASSETS (some may be renamed/split):');
for (const key of selected){const rows=js.filter(f=>f.name.startsWith(key));console.log('  '+key+': '+(rows.length?rows.map(f=>`${f.name} (${fmt(f.gzip)} gzip)`).join(', '):'not found by filename'));}
const large=js.filter(row=>row.raw>500*1024);
console.log('JavaScript files over 500 KiB raw: '+large.length+(large.length?' ('+large.map(x=>x.name).join(', ')+')':''));
const report={generatedAt:new Date().toISOString(),initialGzipBytes:total(initRows),totalJsGzipBytes:total(js),totalCssGzipBytes:total(css),chunks:js,initialAssets:initRows,largeChunks:large.map(x=>x.name)};
const out=process.argv.indexOf('--json');
if(out>=0) {const file=process.argv[out+1];if(!file)throw Error('Missing path after --json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log('Report written: '+file);}
console.log('Compare on SAME hardware & network with production: cold reload, warm reload, first Add Money, Goals, Transactions and Business Home.');
