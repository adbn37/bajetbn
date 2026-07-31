# BajetBN v0.11.0 — Release Candidate Hardening Alpha 1

This staging-only phase prepares the current BajetBN modules for release-candidate testing. It does not deploy production and it does not change financial posting rules.

## Included

- Route-level code splitting so users download each large page only when they open it.
- A whole-app error screen with simple Reload and Overview actions.
- Simple messages for missing Firestore indexes, connection problems, access problems, and file-upload problems.
- A read-only account-total check in Settings.
- A private JSON data download in Settings.
- Stronger staging CI that builds both the web app and Firebase Functions and runs every existing feature check.
- Build-output checks for route chunks and the generated PWA cache list.
- Security-review and release-candidate test documents.

## Account-total check

The check reads each owned Account and its saved account records. It adds the posted account-record amounts and compares the result with the total shown on the Account. It never edits, fixes, deletes, or reposts money information.

If a difference appears, the user should keep the result and report it. Old money activity must not be manually changed to hide a mismatch.

## Data download

The download is created in the user’s browser as a JSON file. It includes information the signed-in user is permitted to read, including profile, Spaces, memberships, owned Accounts, account records, money activity, budgets, goals, bills, shared payments, reminders, and notifications.

The file contains private money information and must be stored securely. This Alpha does not upload the exported file anywhere.

## Not included yet

- Account deletion workflow.
- Automatic repair of mismatched account totals.
- Production deployment.
- Server-generated PDF statements.
- Automated scheduled backups.
