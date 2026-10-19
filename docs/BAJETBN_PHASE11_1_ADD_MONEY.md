# BajetBN Phase 11.1 — Add Money isolated lazy module (staging experiment)

Baseline: `b9c087f961ffb44ea8998a78e7714903a44bbae9` (Phase 11.0 production). Do **not** promote without tests and comparable performance evidence.

## Design and scope

`DashboardPage` previously lazy-imported `TransactionsPage.tsx` to render only the `MoneyActivityModal` export. `TransactionsPage.tsx` contains both the 1,700-line history page and 2,600+ lines of money form, category and transaction detail code. Therefore opening Add Money can require unnecessary transaction-list code.

This controlled staging change creates `MoneyActivityModalV111.tsx` as a **source-exact, mechanically derived copy** of the existing Transactions module, omitting only `export function TransactionsPage()` and its function body. It redirects only the Dashboard loader to the isolated modal export. The original Transactions route and all posting, receipts, transfers, categorization, and business code remain unchanged. No Firebase rules, queries, indexes, functions or data schemas change.

The split is an *experiment*: the same modal implementation temporarily exists in both the original and the new module. A fail-closed static verifier compares generated source to the original on each run. Future modal edits must not diverge. A later source-of-truth consolidation would be required before treating this architecture as permanent. Do not claim performance improvement without measured build and real browser results.

## Gate

1. Run the installer on the exact baseline and a clean feature branch. The installer verifies byte-equivalent normalized original source, produces the isolated module and dashboard import, and installs audit/verifier files.
2. `node scripts/verify-add-money-separation-v111.mjs`, `node scripts/verify-phase110.mjs` (this validates the Phase 11.0 Business/React baseline and should still pass), `node scripts/verify-deep-performance-v108.mjs`.
3. `npm run typecheck`, `npm run build:staging`, `node scripts/verify-built-environment-v11417.mjs staging`, `node scripts/audit-add-money-chunks-v111.mjs`; `git diff --check`.
4. Check that `dist/.vite/manifest.json` has distinct dynamic chunks for `MoneyActivityModalV111` and `TransactionsPage`.
5. Test Personal Home → Add Money for expense, income, transfers; accounts (including credit-card balance direction and Business ↔ Personal); custom category picker and labels; date, payment method, receipt upload and camera; validation errors; saving and success feedback; business vs personal scopes; undo/reversal in full Transactions; receipt viewing; mobile screens.
6. Never create fake financial records on staging — backend configuration may share live data. Use existing authorized records or UI-only checks where possible.
7. Check fresh network, cached network, offline PWA, and direct navigation to Transactions/Business Money. Compare three cold and three warm runs on same device. Promotion only if no regression and meaningful actual improvement (or clear documented rationale).

## Bundle interpretation

Bundled assets can be shared. The audit separately reports static dependency closures for Dashboard, isolated modal, and Transactions page. Their sizes cannot be added naively. Device speed depends on connection, Firestore, caching, parsed JavaScript, hardware and first data fetch. Bundler warnings about >500KiB raw JS are not speed benchmarks.
