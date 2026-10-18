# BajetBN Phase 10.8 — Deep Performance Optimization

Base commit: `20dbf79d599b6580a10adad93f4ca9cb0dd43c43` (10.7 production). Stage only. No Firebase rules/functions/storage changes, account mutations, transaction writes, or auth change.

## Root causes confirmed by reading production source

1. **Goals first navigation:** Phase 10.7 warmed goals, Spaces and contributions as a single `Promise.all` bundle. The Goals page then awaited the bundle to get just the goals. This defeated early rendering when history queries were slower than the goal list.
2. **Transactions:** The page awaited accounts + transaction accounts + Spaces + custom categories **and all attachment metadata** before even starting per-account transaction history queries. History can begin as soon as personal account IDs are known; attachment indicators can update after monetary records render.
3. **Accounts:** Personal/owned accounts and Spaces arrived, but the page still waited on all shared Business Space account queries before it displayed even owned balances.
4. **Goals rendering CPU:** Each goal filtered *all* contributions individually on each render. Pre-indexing history reduces the repeated work as records grow.

## Changes

- **Goals:** warm three independent, single-use owner-scoped Promises, all still limited to four seconds. Render goal records without waiting for slower contribution history or Spaces labels. Keep the existing no-stale-results guards. Group top-three recent contributions per goal only once.
- **Transactions:** fetch per-account transaction lists in parallel with independent data requests. Load optional attachment counts after the transaction list is available. Failed attachment indicators do not hide otherwise available transaction history; opening details still fetches its own attachments.
- **Accounts:** render authoritative owned account balances after owned account + Space reads. While shared accounts are loading, explicitly warn that totals are partial. Keep existing access-controlled shared account calls and merge behavior.
- **Performance check:** `scripts/audit-bundles-v108.mjs` prints gzip and raw emitted chunks. It does not pretend that sum-of-chunks equals page-transfer bytes.

## Required staging test matrix

1. DevTools Network tab, **disable cache**; measure Home → Add Money, Goals, Transactions, Accounts, Business. Repeat with cache enabled. Separate loading animation response from form/data usability.
2. Test **Goals** with multiple goals, contributions, a Plan Space, and immediately after recording/reversing a contribution. History order and goal totals must not change. Test rapid owner/sign-out transitions.
3. Test **Transactions** with many accounts, receipt attachments, account switching, transfer, reversal, and linked Business → Personal transfer. First rendered history and later attachment badges must match production; do not create fake financial records because staging uses the real Firebase project.
4. Test **Accounts** with owned and shared accounts. Read-only shared permissions must remain respected. While shared rows load, displayed totals are explicitly incomplete. After completion, counts and values must match production. Test archived/closed accounts and Space-embedded view.
5. Verify existing Phase 10.7 business audit and `npm run typecheck`, full staging build, environment marker.
6. Compare three cold runs and three warm runs on the *same device and connection*. Use Chrome DevTools Network `Finish` and screenshots/video of first usable view. Do not promote based on developer build size alone.

## Important limitation

This targeted patch reduces confirmed unnecessary waits but does **not** prove that every page will load under a specific millisecond threshold. Network round trips, Firestore geographic latency, a large 5,000-line Transactions module shared by Add Money, offline initialization and third-party code may remain bottlenecks. A subsequent code-splitting refactor for MoneyActivityModal requires separate visual/function test coverage.
