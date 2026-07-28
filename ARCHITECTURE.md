# Architecture decisions — v0.1.0

## Accounts remain independent from Spaces

An Account belongs to its owner. It is not nested beneath a Space. Future transactions will carry both `accountId` and `spaceId`, allowing one Account to participate in different life contexts without duplicating the Account.

## Membership is explicit

`spaceMembers/{spaceId_uid}` separates Space ownership and access from the Space document. Permission fields already distinguish:

- using connected Accounts
- viewing Account balances
- viewing ledger details

The collaboration interface is deferred, but the data boundary is present. Account-specific sharing is represented separately through `accountAccess/{accountId_uid}` so account use, balance visibility, and ledger visibility do not collapse into one permission.

## Posted records are the source of truth

Opening balances are financial postings. Therefore Account creation is a callable Cloud Function that atomically writes:

1. the Account
2. a posted opening-balance ledger entry
3. an idempotency command record

The browser cannot write these collections directly.

## No silent financial edits

The opening balance is immutable from the Account edit form. When the full transaction engine is implemented, corrections will be posted adjustments or reversals.

## Minor units

All money values use safe integers such as `1050` for BND 10.50. Formatting happens only at the interface boundary.

## Technical and display IDs

Firestore provides random technical document IDs. Separate display IDs such as `ACC-12AB34CD` are shown to users.

## Offline path

Offline financial mutations are not enabled in Phase 1. The future queue will store a client mutation ID and idempotency key, then reconcile temporary projected values against server-posted ledger balances.
