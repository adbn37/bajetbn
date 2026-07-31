import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const indexPath = path.join(dist, 'index.html');
const manifestPath = path.join(dist, 'precache-manifest.json');
assert.equal(fs.existsSync(indexPath), true, 'dist/index.html is missing');
assert.equal(fs.existsSync(manifestPath), true, 'dist/precache-manifest.json is missing');

const index = fs.readFileSync(indexPath, 'utf8');
const assetMatches = [...index.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map((match) => match[1]);
assert.equal(assetMatches.some((item) => item.endsWith('.js')), true, 'The built page does not include a JavaScript entry file');
assert.equal(assetMatches.some((item) => item.endsWith('.css')), true, 'The built page does not include a CSS file');

const assetDir = path.join(dist, 'assets');
const files = fs.readdirSync(assetDir);
const jsFiles = files.filter((item) => item.endsWith('.js'));
assert.equal(jsFiles.length >= 5, true, `Expected route code splitting, but only ${jsFiles.length} JavaScript files were built`);

const entryJs = assetMatches.filter((item) => item.endsWith('.js')).map((item) => path.join(dist, item.slice(1)));
for (const file of entryJs) {
  const bytes = fs.statSync(file).size;
  assert.equal(bytes < 850 * 1024, true, `The first-load JavaScript file is too large: ${path.basename(file)} (${bytes} bytes)`);
}

const report = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(Array.isArray(report.criticalUrls), true, 'PWA critical file list is missing');
assert.equal(Array.isArray(report.optionalUrls), true, 'PWA optional file list is missing');
assert.equal(report.criticalUrls.includes('/index.html'), true, 'PWA critical files do not include index.html');
assert.equal(report.optionalUrls.some((item) => item.endsWith('.js')), true, 'Lazy page files are not included in the PWA cache list');

const biggest = jsFiles.map((file) => ({ file, bytes: fs.statSync(path.join(assetDir, file)).size }))
  .sort((a, b) => b.bytes - a.bytes)[0];
console.log(`Build output checks passed (${jsFiles.length} JavaScript chunks; largest ${biggest.file} at ${(biggest.bytes / 1024).toFixed(1)} kB).`);
