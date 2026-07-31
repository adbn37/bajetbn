# BajetBN v0.11 Security Review

## Financial data

- Accounts cannot be created, changed, or deleted directly by the browser.
- Money activity and account records cannot be written directly by the browser.
- Budgets, goals, bill payments, shared-payment finalisation, and undo actions remain server-controlled where they affect money totals.
- Existing command records provide duplicate protection for server financial actions.

## User and Space access

- A user can read only their own profile.
- Space records require active Space membership.
- Invitation management is limited to Space owners and admins.
- Suspended or removed members are not treated as active members.
- Account balance and account-activity visibility remain separate permissions.

## Payment proof files

- Shared payment proofs require active Space membership.
- Only image files and PDF files are accepted.
- Files must be smaller than 10 MB.
- Existing proof files cannot be replaced or deleted from the browser.
- All unmatched Storage paths remain blocked.

## Data tools

- The account-total check is read-only.
- The data download is prepared locally in the browser.
- The data tool repository contains no create, update, or delete Firestore calls.
- Users are warned that downloaded files contain private money information.

## Items still blocked from production

- Account deletion needs a verified re-authentication and retention process.
- Firebase rules should be emulator-tested before the production release.
- Production Firebase, Storage, Cloudflare, and domain settings require a separate approval checklist.
- A full backup and restore drill is still required before production.
