# BajetBN: UI + Taste + Motion — Phase 3

## Design brief

Implements a practical subset of the selected Design Motion Principles preview.
The preview is a concept and may contain arbitrary financial values or screens
that are not part of the existing BajetBN product. This patch uses **real BajetBN
financial data and existing transaction handlers only**.

### UI UX Pro Max
- Establishes a distinct **Quick money actions** toolbar on Home rather than only recoloring old cards.
- Improves section hierarchy, icon consistency, tabular financial figures, and mobile clarity.

### Taste Skill
- Keeps the existing teal identity and user-selectable light/dark themes.
- Removes alphabet-letter icons for built-in shortcuts using a coherent SVG outline family.
- Uses restrained spacing and visual surfaces rather than decorative gradients everywhere.

### Design Motion Principles
- Applies short dialog entrance/backdrop transitions (160–230ms).
- Uses hover/focus/active feedback where it communicates a real state.
- Respects `prefers-reduced-motion`, and does not animate financial values or fake success states.

## Scope and safety

Changed files: `src/main.tsx`, `src/pages/DashboardPage.tsx`.
Added: `src/components/HomeShortcutSymbol.tsx`, `src/styles/design-motion-v3.css`,
`docs/BAJETBN_DESIGN_MOTION_PHASE3.md`, `scripts/verify-design-v3.mjs`.

No Cloud Functions, Firebase rules, Firestore data schema, API, payment posting, or finance formulas change.
The Add activity button uses the existing `openQuickActivity('activity')` handler
and starts with its **existing type default**, which is not forced to income.
The Move money button uses `openQuickActivity('move')` and disables if fewer than two
accounts are available. Business-only restrictions and Space selection are owned
by the unchanged transaction form.

## QA checklist

- Run static verifier, `npm run typecheck`, `npm run build`, and `git diff --check`.
- Existing `npm run lint` can have pre-existing baseline violations. Compare with clean main;
  don't disable ESLint rules to conceal regressions.
- Verify at 320, 375, 390, 440 and 1280 CSS px in Chrome DevTools.
- Check light/dark themes, Personal/Business overview switching, Space picker arrow
  independence, active account, scrollable accounts, and six user-configured shortcuts.
- Open Add activity; verify correct type, account, currency and Space before saving.
- Open Move money; verify source/destination and cross-scope restrictions.
- Check offline queue; queued is never presented as confirmed posted.
- Use DevTools rendering settings to simulate reduced motion and keyboard-only focus.
- Make sure Recent Activity can scroll fully above bottom nav on real mobile device.

No live deployment or push is performed by the installer.
