# BajetBN v0.11.12 Transaction Receipts and Documents

BajetBN now supports optional receipt/document attachments on ordinary Money activity records.

## Included

- Up to five files per Money activity record.
- Up to five images or PDF files, below 10 MB each.
- Private user-scoped Storage paths.
- Server-validated metadata linked to the original transaction and Space.
- Open and remove controls inside Money activity details.
- Storage cleanup during normal self-service account deletion.
- Existing payment-proof flows remain separate and unchanged.

## Safety boundaries

- Attachments require internet and are not part of the v0.11.11 offline queue.
- Financial values, Account balances, Budget totals and reversals are not changed by attachment actions.
- Firestore metadata writes are server-controlled.
- A file uploaded without valid metadata remains inside the user's private folder and is removed by account-deletion cleanup.

## Staging test gate

Test image/PDF upload, invalid file rejection, 10 MB limit, five-file limit, open, remove, mobile layout, ownership isolation and account-deletion cleanup before production.
