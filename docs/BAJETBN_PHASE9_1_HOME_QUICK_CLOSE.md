# BajetBN Phase 9.1 — Home Add Money close/reopen fix

## Symptom

Entering Add Money from the bottom-navigation shortcut `/?quick=1`, then tapping **X**, can immediately reopen the Add Money modal, requiring a second close. This is a quick-query lifecycle race, not a second transaction save.

## Change

- Claim the `?quick=1` one-time opening request inside the deferred microtask, after the effect's `active` check. This respects React StrictMode effect cleanup.
- Do not run another `openQuickActivity()` for the same request while its URL parameter is being removed.
- Mark the request consumed in `closeQuickActivity`, remove `quick` using React Router replacement, and then hide the modal.
- Reset the guard only after `quick` is actually absent, so a subsequent fresh bottom-navigation Add click works.
- Preserve Phase 9 lazy loading, Phase 8 confirmation popup, existing save, category, and balance functions.

## Run

```powershell
node scripts/verify-home-on-demand-v9.mjs
node scripts/verify-home-quick-close-v91.mjs
npm run typecheck
npm run build:staging
git diff --check
```

## Staging acceptance

1. On Home tap bottom navigation **Add**. The form opens exactly once.
2. Tap **X** once. Form closes and Home is visible; it does not reopen.
3. Tap bottom navigation **Add** again. Form opens once, and X closes it once.
4. Tap **Cancel**. Form closes without reopening.
5. Open Home's own Add Money and Move Money actions, then close each once.
6. Record a disposable transaction in the shared staging Firebase backend; Phase 8 confirmation and **Done** still work.
7. Use browser Back after closing: quick query should not cause the form to reopen.

**Production**: Do not promote until staging acceptance. Staging and production currently share Firebase `bajetbn-staging`; use only disposable records for tests.
