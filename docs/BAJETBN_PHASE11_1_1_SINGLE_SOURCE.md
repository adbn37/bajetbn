# BajetBN Phase 11.1.1 — Add Money single source of truth (staging)

**Base approved staging commit:** `3a77ef6c122b7626ce88af45171e3b9fd3a52808`

**Purpose:** Fix Phase 11.1's duplicated money form before production. Phase 11.1 staging passed UI smoke tests and produced distinct Add Money and full Transactions chunks. It did not establish a measured production-like speed improvement, and maintaining two money forms would cause future bugs.

## Code change

- Keep `src/features/transactions/MoneyActivityModalV111.tsx` **byte-equivalent after newline normalization** to the tested Phase 11.1 modal. This is the **only** `MoneyActivityModal` implementation.
- Remove the duplicate `export function MoneyActivityModal(...) { ... }` function from `TransactionsPage.tsx` **only**.
- Import the same modal in `TransactionsPage.tsx` for its two entry points, and re-export the original public `MoneyActivityModal` name to avoid breaking consumers.
- Retain all existing Transactions history, receipts, correction, reversal, category and finance logic in their existing components. Other shared category/transaction helper code remains in both modules; this patch eliminates duplicate **Add Money form logic** without broad component refactors.
- Keep `DashboardPage.tsx` and its lazy import unchanged; preserve Firebase/Auth, source-of-truth accounting and Firestore rules/functions/storage unchanged.
- Update the old Phase 11.1 verifier to understand the new single-source architecture; add `verify-add-money-single-source-v1111.mjs` that compares the full working files against an exact mechanical transformation of the approved staging commit, including Windows line endings.

## Release gate

1. Create `feature/add-money-single-source-v1111-20261019` from the **exact** Phase 11.1 staging commit. Installer refuses any other base or branch or any dirty tree.
2. Dry run, install. Run `node scripts/verify-add-money-single-source-v1111.mjs` and `node scripts/verify-add-money-separation-v111.mjs`.
3. Verify `node scripts/verify-phase110.mjs`, `node scripts/verify-deep-performance-v108.mjs`, `npm run typecheck`, `npm run build:staging`, `node scripts/verify-built-environment-v11417.mjs staging`, and `node scripts/audit-add-money-chunks-v111.mjs`.
4. Verify both the Dashboard and Transactions routes can render Add Money with compatible props, categories, labels, attachments, camera, transfers, Business and personal account scopes, stale response guards, and confirmation/receipt flows.
5. Test **staging only**; shared Firebase project may hold live financial records — no fake saves. Repeat cold/warm Add Money checks and compare the Phase 11.1 bundle report.
6. This update does **not** guarantee a timing win. Production must stay at Phase 11.0 until the new staging patch passes tests and shows acceptable performance. If stage testing discovers a regression, do not promote.

## Known limitation

`MoneyActivityModalV111.tsx` still contains other helper components copied from the original source (e.g., receipt details and category manager). The **Add Money form implementation** is now single-source. Future phases can extract common helpers for optimal deduplication, but changes to sensitive financial logic require separate testing.
