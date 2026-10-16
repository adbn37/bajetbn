# BajetBN Phase 10.5 — Bottom Navigation + Recent Activity Icons

Base: approved production `11042a0890104469c67d1b40b4e840ef9a8a5f25` (v1.24.0)

## Scope

- Change the five mobile bottom navigation glyphs to real neon-glass SVGs:
  Home (v10.2 home), Transactions (v10.4 activity), Add (v10.4 add),
  Goals (v10.2 target), More (new matching v10.5 artwork).
- Keep the original `NavLink` routes, active states, Add onClick and labels unchanged.
- Render Recent Activity using the existing category icon assets with the same
  custom-upload > built-in SVG > glyph fallback order as transaction lists.
- Preserve the Home lazy-loaded Money Activity modal; don't import TransactionsPage.
- Existing transaction-list category rendering (Phase 10.2) is not modified.
- No financial calculations, Firestore, auth, permissions, PWA, or data migrations.

## Validation

Run `node scripts/verify-mobile-nav-activity-v105.mjs`, `npm run typecheck`,
`npm run build:staging`, `node scripts/verify-built-environment-v11417.mjs staging`
then preview on the staging Pages deployment. Confirm navigation labels and tapping
Home / Transactions / Add / Goals / More, custom category images and layout in
narrow phone and light/dark modes. Staging and production currently share the
`bajetbn-staging` backend: only create disposable test records.

## Rollback

Do not merge into `main` until staging is approved. If needed, switch back
from the Phase 10.5 feature branch and deploy the previous staging release.
