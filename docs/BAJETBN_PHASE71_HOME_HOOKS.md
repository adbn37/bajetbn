# BajetBN Phase 7.1 — Home Hooks Stabilization

**Scope:** One React source file on the existing design feature branch. No CSS, financial calculations, Firestore queries, transaction posting rules, contracts, accounts, or permissions are changed. This package is *not* a release or deployment.

## Preconditions

- Current branch: `feature/combined-design-skills-20261014`
- BajetBN `package.json` version 1.24.0
- Phase 7 checkpoint commit `4d67e15` already committed and pushed
- `src/pages/DashboardPage.tsx` must have no uncommitted changes.

## Installation (PowerShell)

Extract the ZIP, then in a second PowerShell terminal:

```powershell
cd "C:\Users\ivms.assistant\BajetBN"
$installer = "$env:USERPROFILE\Downloads\bajetbn-phase71-home-hooks\install-phase71.mjs"
node $installer --repo (Get-Location).Path --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Dry-run failed: stopped' }
node $installer --repo (Get-Location).Path
if ($LASTEXITCODE -ne 0) { throw 'Install failed: stopped' }
```

If the ZIP was extracted to a different folder, adjust `$installer` to its location.

## Verification

```powershell
node scripts/verify-design-v71.mjs
node scripts/verify-design-v7.mjs
node "$env:USERPROFILE\Downloads\BajetBN_Lint_Regression_Audit_20261015.cjs" --repo (Get-Location).Path
npm run typecheck
npm run build
git diff --check
git diff --stat
git status --short
```

**Passing acceptance:** zero *introduced* ESLint errors in the regression audit. The full existing lint baseline contains hundreds of findings and is not expected to be clean yet. Do not suppress lint rules or merge on TypeScript/build alone.

## Browser smoke checks using `npm run dev -- --mode staging`

1. Personal Home loads, refreshes and switches accounts without showing the previous account's activity.
2. Rapidly switch accounts while on a slow network; activity for the previous account must not appear for the newly selected account.
3. Save custom Home shortcuts; refresh; verify the selection persists; sign out and sign in to confirm user-scoped preferences.
4. Home Add Money button opens the expected Money Out form; Move Money opens transfer; Cancel closes the sheet.
5. Open `/?quick=1` signed in: Add Money opens once, and closing it removes `quick=1`.
6. Business Home and Personal/Business context switch still work; no unsupported cross-scope account is offered.

No live financial transaction is needed to validate these effects. Use test data only if you later run end-to-end money flow checks.

## Patch detail

- Reads local shortcut preferences asynchronously after the effect with cancellation on auth change.
- Defers account loads to a microtask with cleanup cancellation.
- Moves carousel index synchronization into the existing animation-frame workflow.
- Adds a monotonic request token for account activity fetches so out-of-order responses cannot overwrite the selected account history; clears previous-account activity while loading.
- Defers URL-triggered Add Money dispatch with cleanup cancellation.

## Rollback

The installer creates an outside-repository backup of `DashboardPage.tsx`, and it prints its path. For Git rollback of this uncommitted patch:

```powershell
git restore -- src/pages/DashboardPage.tsx
Remove-Item scripts/verify-design-v71.mjs, docs/BAJETBN_PHASE71_HOME_HOOKS.md
```

Do not run the rollback after you have made other desired changes to DashboardPage.tsx unless you are prepared to lose those later edits. The installer never commits, pushes, or deploys.
