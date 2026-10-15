# BajetBN v1.24.0 — Design integration Phase 5

## Goal
Use UI UX Pro Max as UI guidance, Taste Skill for cleaner hierarchy, and Design Motion Principles for subtle and accessible feedback. This is an implementation of selected principles rather than a verbatim transfer of third-party assets.

## Actual changes
- Wraps Personal Home's existing Total Assets card and selected-account This Month section in a responsive financial workspace. Desktop presents them side by side; mobile presents a compact vertical dashboard.
- Adds **net posted flow for the selected account** from the existing Phase 4 income and expense aggregates. It excludes transfers, is hidden with balance-visibility off, and does not claim to represent all account balances.
- Keeps existing Add activity / Move money / Activity handlers and routes.
- Moves the Date field below the account/Space selection in the existing Money Activity form, making amount and account more prominent. The date state, validation and submit semantics are unchanged.
- Changes only the mobile fourth tab from Spaces to Goals. Spaces is still on **More → Tools → Spaces**, and Spaces routes / data are unchanged.
- Uses lightweight CSS transitions, existing theme tokens and `prefers-reduced-motion` without additional JS dependencies.

## Important limits
- No upcoming bills totals or trend charts are fabricated; those need a dedicated approved data source.
- The monthly amount is a **selected account** subtotal, not an all-BajetBN cash-flow report.
- A style/UX patch cannot prove real financial posting correctness; test posting in staging against authorized test data.
- The installer aborts on unmatched source anchors, wrong branch, wrong app version, duplicate installs, and missing Phase 3/4 foundations.
- The current app still has pre-existing ESLint failures; do not silently disable rules or ignore newly introduced errors.

## QA checklist before release
1. `node scripts/verify-design-v5.mjs`, `npm run typecheck`, `npm run build`, `git diff --check`.
2. Check mobile at 320 / 375 / 390 / 440 pixels and desktop at 1280 / 1440 pixels.
3. Inspect Personal, Business, both theme modes, hidden balances, multiple accounts, negative balances, shared accounts, offline state, initial empty states.
4. Verify Add activity for income/expense, and cross-scope Move money with two authorized test accounts only, plus error/queued/offline handling.
5. Verify the bottom tab Goals opens `/goals`; More still opens `/spaces`; no fixed-bottom overlap.
6. Check keyboard focus and reduced-motion mode. No new success animation is played before backend confirmation.
7. Deploy to staging only after tests; production requires explicit approval.
