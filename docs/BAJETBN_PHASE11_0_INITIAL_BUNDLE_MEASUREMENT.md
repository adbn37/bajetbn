# BajetBN Phase 11.0 — Initial Payload and Chunk Attribution

Production baseline `ad2d2aa243fdea1ebaf24a967fbda692ca0bc80f` (Phase 10.9 accepted and deployed). **Staging only**. No account, auth, permission, Firebase backend, financial calculation, transaction, goal, service worker, or stylesheet modifications.

## Findings grounded in current production code

- `src/pages/DashboardPage.tsx` eagerly imports `GlobalBusinessOverview` despite rendering it only in Business Home mode. React.lazy + its existing `Suspense` import were used to defer the Business module without changing its input props or data access.
- Vite 8/Rolldown's default chunking generated a `>500 KB` minified JS warning in production. Warning alone is **not proof** of slow first loading. Rolldown's supported `codeSplitting.groups` strategy is tested on staging with entry-aware React, Firestore, and Auth buckets. No huge `node_modules` blanket vendor bucket. The chunk graph needs browser testing; manual grouping can increase module requests and alter evaluation order.
- The Home Add Money modal still lazy-imports the same approximately 5,000-line `TransactionsPage.tsx`. **Phase 11.0 does not change this shared module**: preserving the existing money/receipt/save workflow is prioritized over an unsafe untested extraction. Measure its emitted chunk and first-open time for targeted follow-up.
- `src/styles/global.css` exceeds 550 KiB **source**, but output CSS is minified. No selectors are removed in this phase; report the emitted critical CSS in gzip and make a later scoped extraction only after visual acceptance.

## Changes

1. Home: remove eager `GlobalBusinessOverview` import and use a lazy module with an accessible loading state. Personal Home no longer statically links the Business overview JS.
2. `vite.config.ts`: enable a Vite manifest and three named `build.rolldownOptions.output.codeSplitting.groups`. Vite 8, not legacy Rollup syntax. Staging and production use the same setting, so production approval compares like for like.
3. `scripts/audit-critical-bundle-v110.mjs`: analyze emitted JS and CSS by gzip, and initial entry static closure using Vite's build manifest. No private Firebase data read. Optional `--json` output.
4. `scripts/verify-phase110.mjs`: static safety checks, Windows CRLF-tolerant. Does not substitute for TypeScript, build or real browser tests.

## Acceptance (required before any promotion)

1. Run static verifier, `npm run typecheck`, `npm run build:staging`, environment verification and bundle audit.
2. Compare pre-patch baseline `node scripts/audit-first-load-bundles-v109.mjs` and new manifest-aware audit. Avoid claiming that sum of all chunks equals first navigation payload.
3. Test Personal Home, Business Home, Add Money, Goals, Transactions, Accounts, shared Business permissions, receipts, Business finance and POS/ADBN workspaces.
4. On desktop and mobile, compare three cold and three warm runs under equivalent conditions. Check console for chunk-loading errors, white screens, style flashes, stale SW and stale build marker.
5. Do **not** write financial test data to staging — Firebase backend may be shared with production.

## Rollback

Restore git branch `main` at approved baseline. Do not fast-forward or deploy production until acceptance. If Vite chunking causes runtime issues, remove Phase 11.0 before re-trying, rather than changing `chunkSizeWarningLimit` to hide a warning.

## Limitations

This release **does not promise** a certain response time, reduced total JS gzip, or removal of every >500 KiB warning. Those are measured outcomes, not preconditions of the patch.
