# BajetBN Phase 9 — Faster Personal Home (on-demand Add Money)

**Scope:** Frontend performance only, staging first. Prepared against `main` commit `95c06ae` (Phase 8 accepted). No CSS redesign, Firebase code, financial calculations, transaction posting or permissions changed.

## Why

`DashboardPage.tsx` eagerly imports `MoneyActivityModal` from the entire `TransactionsPage.tsx` module. This makes the Home page depend on the Transactions module before the user opens Add Money, even though navigation to Transactions is already lazy. Phase 9 turns this into an on-demand import while retaining the same modal props and handlers. It adds a local `Suspense` loading status for slower networks.

## Installation

1. Create branch `feature/home-on-demand-v9-20261016` at approved production commit `95c06ae` in a **clean** repository.
2. Extract this ZIP.
3. Dry-run then install, giving the installer your repo path.

```powershell
node <path-to-extracted-folder>\install-phase9.mjs --repo (Get-Location).Path --dry-run
node <path-to-extracted-folder>\install-phase9.mjs --repo (Get-Location).Path
```

## Verification

```powershell
npm run typecheck
npm run build:staging
node scripts/verify-home-on-demand-v9.mjs
node scripts/verify-built-environment-v11417.mjs staging
git diff --check
git status --short
```

**Staging browser smoke:** Personal Home first load and account switch; Business Home; Add Money from Home and bottom +; quick URL `/?quick=1`; save/Done/WhatsApp popup; transfer; route navigation to Transactions. On slow network, ensure the "Preparing Add Money…" status appears and the modal opens. No real money records for testing: staging and production share Firebase.

**Acceptance:** TypeScript and staging build PASS; verify script PASS including dynamic import in built Home chunk; static lint comparison has 0 new errors; Home initial Network waterfall does not preload the TransactionsPage JS until Add Money/Transactions is opened; user confirms UI.

## Rollback

If not committed: `git restore -- src/pages/DashboardPage.tsx`, then delete the two added docs/scripts. If already committed, revert the Phase 9 commit and redeploy staging. The installer saves a temp backup path.

Production remains untouched until staging approval. There is no guaranteed speedup figure without an actual browser network measurement.
