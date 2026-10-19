#!/usr/bin/env node
/** Static checks only. Browser smoke test and measured build comparison remain mandatory. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path) => fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n');
const home=read('src/pages/DashboardPage.tsx');
const vite=read('vite.config.ts');
const build=read('scripts/build-app.mjs');
const serviceWorker=read('scripts/generate-service-worker.mjs');

assert(home.includes("const GlobalBusinessOverview = lazy(() => import('../features/business/GlobalBusinessOverview')"), 'Home Business overview must be lazy');
assert(!home.includes("import { GlobalBusinessOverview } from '../features/business/GlobalBusinessOverview';"), 'Business overview static import remains');
assert(home.includes('<Suspense fallback={<div className="loading-panel" role="status">Loading Business overview…</div>}>'), 'Missing accessible Business loading fallback');
assert(home.includes("loadMoneyActivityFeatureV107()"), 'Add Money warmup removed');
assert(home.includes('const MoneyActivityModal = lazy('), 'Money modal must remain lazy');
assert(vite.includes("manifest: true"), 'Build manifest missing');
assert(vite.includes('rolldownOptions: {'), 'Vite 8 Rolldown options missing');
assert(vite.includes('codeSplitting: {'), 'Rolldown chunk groups missing');
assert(vite.includes("name: 'framework-v110'"), 'Framework chunk missing');
assert(vite.includes("name: 'firebase-firestore-v110'"), 'Firestore chunk missing');
assert(vite.includes("name: 'firebase-auth-v110'"), 'Auth chunk missing');
assert(vite.includes('entriesAware: true'), 'Entry-aware grouping missing');
assert(!/\bmanualChunks\s*:/.test(vite), 'Deprecated Rollup manualChunks must not be configured');
assert(vite.includes("sourcemap: mode !== 'production'"), 'Production source-map policy changed');
assert(build.includes('Firebase project policy:'), 'Existing deployment environment policy changed');
assert(serviceWorker.includes('Do not download every lazy route/tool during installation.'), 'SW must not eagerly precache lazy chunks');
// Warn, not fail: this release does not yet refactor the 5,000-line money-entry module.
console.log('PHASE 11.0 STATIC VERIFICATION PASS');
console.log('Verified: lazy Business overview, Vite 8 chunk groups, build manifest, existing Add Money and deployment safeguards.');
console.log('Remaining: TypeScript build, bundle report, mobile/desktop browser tests.');
