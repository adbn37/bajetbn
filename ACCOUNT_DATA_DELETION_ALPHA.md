# BajetBN v0.11.6 — Account and Data Deletion Alpha 1

## Purpose

This phase replaces the previous “coming later” placeholder with a staged self-service account-deletion workflow. It is designed to remove a person’s private BajetBN data without silently damaging shared financial history that other Space members still depend on.

## User flow

1. The user opens **Settings → Account controls → Delete my account**.
2. BajetBN checks whether the account still owns a shared Space or holds Trip money for another owner.
3. The user downloads a current data export. The export confirmation remains valid for 24 hours.
4. The user re-confirms their password or Google sign-in.
5. The user types `DELETE` and acknowledges the retention explanation.
6. BajetBN creates an audited request with a seven-day cooling-off period.
7. The request can be cancelled until processing begins.
8. A scheduled Firebase Function rechecks all blockers before final deletion.

## Blocking responsibilities

Deletion is paused when either condition remains:

- The user owns a Space that still has another member record. Ownership must be transferred or the Space must be safely resolved first.
- The user is the Trip-money holder in a Space owned by somebody else. The owner must choose another holder first.

The Space Members interface now allows the current owner to make an active member the new owner. Personal Spaces cannot be transferred.

## Data treatment

### Deleted

- Firebase Authentication account
- User profile and private settings
- Private Spaces owned only by the deleting user
- Accounts, ledger entries, private money activity, budgets, goals and private categories
- Private reminders, notifications, command records and personal uploads
- Proof files that belong to the deleting user

### Retained without the user’s identity

Where deletion would damage records used by other members, BajetBN retains the minimum financial/history fields and replaces the user identity with a generated anonymous identifier and the display label **Deleted member**. This includes relevant shared bills, settlements, shared expenses, Trip contributions and Space activity.

### Operational records retained

A minimal deletion tombstone and restricted audit record remain so the deletion job is idempotent, traceable and not silently repeated. Client applications cannot read or write these operational collections.

## Safety controls

- Recent authentication is required; the Firebase token authentication time must be within five minutes.
- A current export is required and expires after 24 hours.
- Requests use idempotency keys.
- A seven-day cooling-off period is enforced server-side.
- Final processing rechecks blockers.
- Failed jobs remain retryable and do not falsely report completion.
- Firestore clients cannot directly write deletion requests, commands, audit records or tombstones.
- The scheduled finalizer runs hourly in `Asia/Brunei` time and processes a limited batch per run. It first disables the Authentication user and revokes refresh tokens, then waits at least two hours before deleting data so an older cached ID token cannot recreate private records after cleanup.

## Staging requirement

This phase changes Firestore rules and Firebase Functions. Deploy both to the staging Firebase project before testing the web interface. Do not merge to production until the full deletion matrix in `STAGING_TEST_CHECKLIST.md` passes with disposable test users.
