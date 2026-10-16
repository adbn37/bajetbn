# BajetBN Phase 10.4 — Home & More Neon-Glass Shortcuts

This staging-only patch is based on **e1a0c8296cdad412a0b89249cd6695bf2489a630** (Phase 10.3 feature branch), not production `main`.

- Home Add activity, Move money, Activity button icons.
- Home shortcut grid for Trips, Bills, Goals, Budgets, Recurring, Subscription and editable shortcuts.
- More page Money/Tools tile icons and Sign out icon.
- Reuses Phase 10.2 static category SVGs plus nine newly bundled navigation SVGs.
- No account balances, routes, click handlers, Firebase, transaction logic or bottom navigation changes.
- Requires preinstalled Phase 10.1-10.3 assets (`public/category-icons-v102/`).

## Home PC

1. Open PowerShell in your home PC's **BajetBN repository** folder. If it is not yet cloned, clone it:
   `git clone https://github.com/adbn37/bajetbn.git "$HOME\BajetBN"` then `cd "$HOME\BajetBN"`.
2. `git fetch origin` and require clean status. `git switch feature/account-space-icons-v103-20261016` and `git pull --ff-only origin feature/account-space-icons-v103-20261016`.
3. Confirm `git rev-parse HEAD` = `e1a0c8296cdad412a0b89249cd6695bf2489a630`.
4. `git switch -c feature/home-more-icons-v104-20261016`.
5. Run `node <extracted-folder>/install-v104.mjs --repo (Get-Location).Path --dry-run`, then same without `--dry-run`.
6. Run `node scripts/verify-navigation-icons-v104.mjs`, `npm run typecheck`, `npm run build:staging`, `node scripts/verify-built-environment-v11417.mjs staging` and `git diff --check`. Stop on failures.
7. Stage the installed files (see list below), commit/push and `npm run deploy:pages:staging`. Do NOT promote to production until visual acceptance.

Files installed:
- `src/components/HomeShortcutSymbol.tsx`
- `src/pages/MorePage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/services/navigationIconAssets.ts`
- `src/styles/design-navigation-icons-v104.css`
- `src/main.tsx`
- `public/navigation-icons-v104/*.svg` (9 new assets)
- `scripts/verify-navigation-icons-v104.mjs`
- `docs/BAJETBN_PHASE10_4_SHORTCUT_ICONS.md`

Staging acceptance: check Home quick actions, Home 6 shortcuts, changed editable shortcuts, More Money/Tools tiles, More sign-out; verify no broken images, controls still work, Add Money does not reopen on close, and prior account/category icons remain.
