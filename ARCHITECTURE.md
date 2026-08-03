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

v0.11.11 enables a bounded IndexedDB queue for new Money activity only. Each local command keeps one stable idempotency key and is replayed through the trusted `postTransaction` Cloud Function. Temporary connection failures remain queued; current-state validation or permission conflicts move to Needs attention. Account balances are never changed locally. Other financial actions remain online-only until separately designed and approved.


## Transaction attachments

Receipt/document binaries use `users/{uid}/transaction-receipts/{transactionId}/...` in Storage. Server-controlled `transactionAttachments` metadata links each file to its owner, transaction and Space. Attachment actions never alter financial postings.
