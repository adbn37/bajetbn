# BajetBN — Phase 4 structural UI improvements

Inspired by UI UX Pro Max (financial UI information hierarchy), Taste Skill (purposeful visual polish), and Design Motion Principles (controlled transitions). These are design references, not bundled runtime dependencies.

## Actual scope

- Home: new selected-account summary using **only** already-loaded posted income and expense transactions for that account. Transfers/reversals excluded. Shown only when activity is available. Bank and total-asset balances remain the same. The new monthly summary is **not an all-accounts P&L**.
- Home: moves the Phase 3 money-action toolbar above Accounts; keeps old action handlers and destination links.
- Money Activity: scoped mobile bottom sheet and sticky Save action. Optional labels are collapsed in a native `<details>` disclosure; existing category, account, amount, date, permissions, receipt and posting code are unchanged.
- Accessibility: keyboard focus styles, reduced-motion handling, visible monetary units, protected balance visibility when assets are hidden.
- No new dashboard graph is fabricated. No fake chart data, account totals, or bills appear.

## Checkpoints

1. Personal/Business switch still selects the correct overview without changing the underlying account destination.
2. On Personal Home, switch bank accounts; the monthly panel must follow the selected account and never sum across all accounts.
3. Hide assets and verify the new monthly figures hide too.
4. Create expense/income with a real staging test account. Verify Money Activity keeps correct account, category, date and Space. Test offline queued posting, correction/undo and WhatsApp sharing separately.
5. Open optional labels, select a label, save and verify. Check keyboard navigation and reduced-motion.
6. Test 320, 375, 390, 440px mobile and desktop 1280px, both light and dark themes, scroll with bottom navigation and keyboard opened.
7. Complete `npm run typecheck`, `npm run build`, `git diff --check` and compare existing ESLint baseline. Never merge to main on static checks alone.

**No Git commit, push, Firebase deployment, or Cloudflare deployment is performed by the installer.**
