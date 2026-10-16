# BajetBN Phase 10.1 — Smart Category Picker (staging first)

Baseline: main commit `f7f130a74c8fdba3f65bd8fc123644d2c2c8d3f3` (Phase 9 and 9.1 accepted).

Scope:
- Search active category names, including custom categories, in the existing Money Entry form.
- Quick pick recently and frequently used categories **on this device** (stored as category IDs/counts only, keyed by user/type/personal-or-business scope).
- Record use only when `postTransaction` returns a posted outcome, **never** for queued, pending-approval or failed outcomes.
- No changes to existing category schema, Firebase security rules, transaction posting, accounts, approvals, or Phase 8/9/9.1.
- Existing category icon rendering is reused. Full 84 scalable SVG pack and hierarchy are **not** introduced here; they require a separate reviewed migration/design release.

Installation:
1. Clean repo on `main` at approved baseline; `git switch -c feature/smart-categories-v101-20261016`.
2. `node install-phase10.mjs --repo C:\Users\ivms.assistant\BajetBN --dry-run`
3. `node install-phase10.mjs --repo C:\Users\ivms.assistant\BajetBN`
4. `node scripts/verify-smart-categories-v101.mjs`
5. `npm run typecheck`, `npm run build:staging`, `git diff --check`.
6. Commit only 5 Phase 10.1 changed/new files. Deploy staging only after checks.

Browser acceptance:
- Money Out: type `food` into category search; Food & drinks appears. Choose a category and save; success popup remains intact.
- Money In: income categories only; personal and business category lists remain scoped properly.
- Reopen Add Money after posted save: Recent (this device) contains saved category. After repeated posted saves, Frequent (this device) appears if enough *different* categories have been used.
- Search with no matches: clear empty state, no category selected accidentally.
- Custom categories remain accessible and preserve their icons.
- Offline queued, pending approval and failed transactions must **not** update on-device smart suggestions.
- Transfer: no category selector or quick picks.
- X/Cancel closes once (Phase 9.1 regression).

Because BajetBN staging and production still use the same Firebase backend, only use disposable test records.
