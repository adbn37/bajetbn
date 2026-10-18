#!/usr/bin/env node
/** Static JS bundle audit. Read-only, no Firebase calls. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const dist = path.resolve('dist');
if (!fs.existsSync(dist)) { console.error('Run npm run build:staging first.'); process.exit(1); }
function walk(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((item) => {
    const p = path.join(folder, item.name);
    return item.isDirectory() ? walk(p) : [p];
  });
}
const results = walk(dist).filter((p) => p.endsWith('.js')).map((p) => {
  const data = fs.readFileSync(p);
  return {
    path: path.relative(dist, p).split(path.sep).join('/'),
    bytes: data.length,
    gzipBytes: zlib.gzipSync(data, { level: 6 }).length,
  };
}).sort((a, b) => b.gzipBytes - a.gzipBytes);
const total = results.reduce((sum, entry) => sum + entry.gzipBytes, 0);
console.log('BajetBN bundle audit v10.7 — estimated compressed JS sizes');
console.log(`Chunks: ${results.length}; total gzip if all loaded: ${(total/1024).toFixed(1)} KiB`);
console.log('Note: total is NOT initial page size; routes are lazy-loaded.');
for (const p of results.slice(0, 20)) console.log(`${(p.gzipBytes/1024).toFixed(1).padStart(7)} KiB gzip | ${(p.bytes/1024).toFixed(1).padStart(7)} KiB raw | ${p.path}`);
const warnings = results.filter((p) => p.bytes > 500_000);
console.log(`Chunks larger than 500 KB raw: ${warnings.length}`);
