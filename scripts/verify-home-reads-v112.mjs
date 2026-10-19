#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { BASELINE_V112, FEATURE_V112, transformHomeV112, transformV1111VerifierV112, normalizeV112 } from './transform-home-v112.mjs';

const output = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
assert.equal(output('branch', '--show-current'), FEATURE_V112, 'Wrong feature branch');
const head = output('rev-parse', 'HEAD');
assert(head === BASELINE_V112 || output('merge-base', '--is-ancestor', BASELINE_V112, 'HEAD') === '', 'Wrong base commit');
const baseline = execFileSync('git', ['show', `${BASELINE_V112}:src/pages/DashboardPage.tsx`], { encoding: 'utf8' });
const home = normalizeV112(fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8'));
assert.equal(home, transformHomeV112(baseline), 'Home source does not match the reviewed Phase 11.2 transformation');
const oldV1111 = execFileSync('git', ['show', `${BASELINE_V112}:scripts/verify-add-money-single-source-v1111.mjs`], {encoding:'utf8'});
const actualV1111 = normalizeV112(fs.readFileSync('scripts/verify-add-money-single-source-v1111.mjs', 'utf8'));
assert.equal(actualV1111, transformV1111VerifierV112(oldV1111), 'Prior Add Money regression gate was unexpectedly changed');
const wrapper = normalizeV112(fs.readFileSync('src/services/homeReadCoalescingV112.ts', 'utf8'));
assert(wrapper.includes('singleFlightByOwnerV112(listSpaces)'));
assert(wrapper.includes('singleFlightByOwnerV112(listAllCustomCategories)'));
assert(home.includes('const homeSpaceV112 = spaces.find('));
assert(home.includes('const nextSpaces =\n            await readHomeSpacesV112('));
assert(home.includes('      [user, spaces],'));
const singleFlight = normalizeV112(fs.readFileSync('src/services/singleFlightByOwnerV112.ts', 'utf8'));
assert(singleFlight.includes('pending.delete(ownerId)'), 'Settled reads must not persist');
assert(!/localStorage|sessionStorage|indexedDB|setDoc\(|updateDoc\(|deleteDoc\(|addDoc\(/.test(wrapper + singleFlight), 'Coalescer must not persist or write');
// Runtime test the ACTUAL TypeScript implementation using Node's erasable TS support.
const runner = `
import assert from 'node:assert/strict';
import { singleFlightByOwnerV112 as single } from './src/services/singleFlightByOwnerV112.ts';
let calls = [];
const resolvers = new Map();
const get = single(uid => { calls.push(uid); return new Promise(resolve => resolvers.set(uid, resolve)); });
const a = get('owner-a'); const b = get('owner-a'); const c = get('owner-b');
assert.strictEqual(a, b, 'Same owner overlapping calls must share promise');
assert.notStrictEqual(a, c, 'Different owners must not share promise');
await Promise.resolve();
assert.deepEqual(calls, ['owner-a', 'owner-b']);
resolvers.get('owner-a')(['a']); resolvers.get('owner-b')(['b']);
assert.deepEqual(await a, ['a']); assert.deepEqual(await c, ['b']);
const d = get('owner-a');
assert.notStrictEqual(a, d, 'Settled reads must not be cached');
await Promise.resolve(); assert.equal(calls.length, 3);
resolvers.get('owner-a')(['new']); assert.deepEqual(await d, ['new']);
let attempts = 0;
const failOnce = single(async () => { attempts++; if(attempts === 1) throw Error('offline'); return 'retry ok'; });
const first = failOnce('owner-a'); const same = failOnce('owner-a');
assert.strictEqual(first, same);
await assert.rejects(first, /offline/);
assert.equal(await failOnce('owner-a'), 'retry ok');
assert.equal(attempts, 2);
console.log('In-flight owner isolation, retry, and no-stale-cache runtime tests PASS');
`;
const processResult = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', runner], {
  encoding: 'utf8', cwd: process.cwd(),
});
if (processResult.status !== 0) {
  throw new Error(`Single-flight runtime test failed:\n${processResult.stderr}\n${processResult.stdout}`);
}
process.stdout.write(processResult.stdout);
// No changes to authorization, offline queue, financial data or Firebase initialization.
for (const file of ['src/services/firebase.ts', 'src/contexts/OfflineSyncContext.tsx', 'src/contexts/AuthContext.tsx', 'src/repositories/transactionRepository.ts']) {
  const before = execFileSync('git', ['show', `${BASELINE_V112}:${file}`], { encoding: 'utf8' });
  assert.equal(normalizeV112(fs.readFileSync(file, 'utf8')), normalizeV112(before), `${file} unexpectedly changed`);
}
console.log('BAJETBN PHASE 11.2 HOME FIRESTORE READ VERIFICATION PASS');
console.log('Source & runtime checks pass; measure actual Home reads/latency with DevTools before promotion.');
