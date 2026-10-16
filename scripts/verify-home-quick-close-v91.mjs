// Phase 9.1 static safety checks. Browser interaction testing remains required.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync('src/pages/DashboardPage.tsx','utf8');
assert.match(source,/BAJETBN_PHASE91_QUICK_CLOSE_GUARD/, 'Phase 9.1 marker missing');
assert.match(source,/const quickOpenHandledRef = useRef\(false\)/, 'Quick-open claim ref missing');
assert.match(source,/if \(!active \|\| quickOpenHandledRef\.current\) return;/, 'Safe StrictMode/microtask claim check missing');
assert.match(source,/quickOpenHandledRef\.current = true;\s*void openQuickActivity\(\);/, 'Quick-open request must be claimed before opening');
assert.match(source,/searchParams\.get\('quick'\) !== '1'[\s\S]*?quickOpenHandledRef\.current = false;\s*return;/, 'Guard reset when query is gone missing');
assert.match(source,/function closeQuickActivity\(\) \{\s*\/\/[^\n]*\n\s*quickOpenHandledRef\.current = true;/, 'Close handler must block reopen');
assert.match(source,/function closeQuickActivity\(\)[\s\S]*?next\.delete\('quick'\);[\s\S]*?setSearchParams\([\s\S]*?\{ replace: true \}[\s\S]*?setShowMoneyActivity\(false\);/, 'Close must clear URL and hide modal');
assert.match(source,/<Suspense fallback=\{<div className="loading-panel bajetbn-v9-home-on-demand"/, 'Phase 9 lazy import must remain intact');
assert.match(source,/onSubmit=\{postTransaction\}/, 'Transaction posting callback changed');
assert.match(source,/onComplete=\{async\s*\(/, 'Transaction completion callback changed');
console.log('PHASE 9.1 QUICK CLOSE GUARD PASSED (static checks; test X in browser).');
