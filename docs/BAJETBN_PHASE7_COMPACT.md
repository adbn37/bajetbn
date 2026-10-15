# BajetBN Phase 7 — Compact Transactions and Bills

Targets BajetBN v1.24 on `feature/combined-design-skills-20261014`, AFTER Phase 6.2 Money Activity Repair.

## Actual changes

- Transaction list cards use a scoped compact layout on mobile. The transaction amount, account/Space, date, status, Add receipt and Details remain visible and operable. No filtering or posting logic changed.
- Bills and instalments retain due dates, paid and outstanding amounts, and all action buttons. Recent payment history becomes a native keyboard-accessible disclosure; the existing full-history button remains inside.
- The aggregate Bills `Still to pay` description now explains it adds remaining instalment balances and one cycle per active bill. No total is recalculated.
- Individual Business Home headline clarifies `All-time transaction net` is **not a bank balance**. No transaction calculations changed.
- Styles are scoped and imported AFTER Phase 6.2, and respect reduced motion.

## Explicit boundaries

- This package does **not** modify Firestore, Cloud Functions, transfers, posting, totals or account permissions.
- All-time business transaction net is not a cash balance. Personal Home monthly data can differ from the Money page because their account/Space filters differ.
- **Mixed-currency warning:** the existing Bills aggregate uses the profile currency to format its sum; if commitments use multiple currencies, a currency-grouped financial fix is needed separately before representing it as a precise single-currency total. This package deliberately does not silently change monetary calculations.
- Historical `main` source is not the local uncommitted feature branch. Installer has exact anchor checks and will stop rather than rewrite unfamiliar JSX.

## Release gates

1. Run `node scripts/verify-design-v7.mjs`, `npm run typecheck`, `npm run build`, `git diff --check`.
2. Mobile 320, 375, 390, 440: transaction cards, transfer routes, amounts, receipt and Details buttons, reversed entries; no clipping.
3. Bills overdue, upcoming and linked-Debt cards: Add payment/Pay from Debt, Edit, Share, Stop, Delete and history disclosure; no accidental operations.
4. Scroll fully above bottom navigation; test dark/light, on-screen keyboard, `prefers-reduced-motion`.
5. Test transactions on isolated staging test data and verify posting exactly once, account/Space permission restrictions and no double-counting on transfers.
6. Check current linter baseline; do not deploy to production until differences are understood and functional testing passes.
