import { existsSync, readFileSync } from 'node:fs';

const fail = (message) => { throw new Error(message); };
const read = (path) => readFileSync(path, 'utf8');

function scriptPositions(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)];
  const recovery = scripts.find((match) => /\bsrc=["']\/app-recovery\.js["']/i.test(match[0]));
  const moduleScript = scripts.find((match) => {
    const tag = match[0];
    return /\btype=["']module["']/i.test(tag) && /\bsrc=["'][^"']+["']/i.test(tag);
  });
  return { recovery, moduleScript };
}

function assertRecoveryBeforeModule(html, label) {
  const { recovery, moduleScript } = scriptPositions(html);
  if (!recovery) fail(`${label}: app-recovery.js script tag is missing.`);
  if (!moduleScript) fail(`${label}: Vite module script could not be identified.`);
  if (typeof recovery.index !== 'number' || typeof moduleScript.index !== 'number') {
    fail(`${label}: script positions are unavailable.`);
  }
  if (recovery.index >= moduleScript.index) {
    fail(`${label}: recovery script must appear before module script.`);
  }

  const headEnd = html.search(/<\/head>/i);
  if (headEnd < 0 || recovery.index >= headEnd) {
    fail(`${label}: app-recovery.js must be inside <head>.`);
  }
}

const sourceIndex = read('index.html');
assertRecoveryBeforeModule(sourceIndex, 'Source index.html');

const recoverySource = read('public/app-recovery.js');
for (const token of [
  "const RECOVERY_KEY = 'bajetbn:deployment-recovery';",
  "const RECOVERY_PARAM = '__bajetbn_reload';",
  "window.addEventListener('vite:preloadError'",
  "window.addEventListener('unhandledrejection'",
  "target instanceof HTMLScriptElement",
  "window.location.replace(url.toString())",
  "event.preventDefault()",
]) {
  if (!recoverySource.includes(token)) fail(`Recovery script missing: ${token}`);
}

const headers = read('public/_headers');
for (const token of [
  'Cache-Control: no-cache, must-revalidate',
  '/sw.js',
  'Cache-Control: no-cache, no-store, must-revalidate',
  '/app-recovery.js',
  '/assets/*',
  '! Cache-Control',
  'Cache-Control: public, max-age=31536000, immutable',
]) {
  if (!headers.includes(token)) fail(`Headers missing: ${token}`);
}

const boundary = read('src/components/AppErrorBoundary.tsx');
for (const token of [
  "url.searchParams.set('__bajetbn_reload', String(Date.now()));",
  "window.location.replace(url.toString());",
  "window.location.assign(`/?__bajetbn_reload=${Date.now()}`);",
]) {
  if (!boundary.includes(token)) fail(`Error boundary missing: ${token}`);
}

const generator = read('scripts/generate-service-worker.mjs');
if (generator.includes('KEEP_PREVIOUS_SHELL_CACHES')) {
  fail('Service-worker generator still contains abandoned R13 changes.');
}
if (!generator.includes(".filter((key) => key.startsWith('bajetbn-shell-') && key !== CACHE_NAME)")) {
  fail('Service-worker generator is not restored to v1.3.11 baseline behavior.');
}

if (process.argv.includes('--dist')) {
  for (const path of ['dist/index.html', 'dist/app-recovery.js', 'dist/_headers', 'dist/sw.js']) {
    if (!existsSync(path)) fail(`Built output missing: ${path}`);
  }

  const builtIndex = read('dist/index.html');
  assertRecoveryBeforeModule(builtIndex, 'Built dist/index.html');

  const builtRecovery = read('dist/app-recovery.js');
  if (!builtRecovery.includes("window.addEventListener('vite:preloadError'")) {
    fail('Built app-recovery.js is missing vite:preloadError handling.');
  }

  const builtHeaders = read('dist/_headers');
  if (!builtHeaders.includes('Cache-Control: no-cache, must-revalidate')) {
    fail('Built _headers is missing no-cache handling.');
  }
}

console.log(`Deployment cache recovery verifier: PASS${process.argv.includes('--dist') ? ' (source + dist)' : ' (source)'}.`);
