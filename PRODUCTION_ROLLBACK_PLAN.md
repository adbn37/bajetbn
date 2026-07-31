# BajetBN Production Rollback Plan

## Rollback triggers

Rollback immediately for a critical authentication failure, inaccessible core pages, incorrect account balances, duplicate financial posting, broken reversals, broad permission exposure, or data loss risk.

## Frontend rollback

1. Stop further merges and record the failing deployment URL and commit.
2. In Cloudflare Pages, promote/redeploy the previous known-good production deployment, or revert the release commit on `main` and push the revert.
3. Clear or invalidate only the affected service-worker cache through a new known-good deployment; do not ask users to keep using a known-bad build.
4. Verify sign-in, Overview, Accounts and Money Activity with a controlled production test account.

## Firebase rollback

1. Do not roll back Firestore data by deleting records.
2. Redeploy the last known-good Firestore and Storage rules from the recorded commit when rules caused the incident.
3. Redeploy the last known-good Functions source when a Function caused the incident.
4. Prefer audited compensating/reversal operations for financial records. Never silently edit posted money history.
5. If a schema migration is involved, follow its dedicated forward/rollback procedure before changing application code.

## Communication and evidence

- Record the incident time, affected version, symptoms, scope and rollback action.
- Preserve Cloudflare, Firebase and browser logs.
- Inform users only with confirmed facts and clearly state whether any financial records require review.
- Do not redeploy the failed version until the root cause and regression test are documented.
