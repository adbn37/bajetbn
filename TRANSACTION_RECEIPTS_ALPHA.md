# BajetBN v0.11.12 Transaction Receipts and Documents

BajetBN now supports optional receipt/document attachments on ordinary Money activity records.

## Included

- Up to five files per Money activity record.
- Up to five images or PDF files, below 10 MB each.
- Private user-scoped Storage paths.
- Server-validated metadata linked to the original transaction and Space.
- Optional receipt/document selection directly inside Add Money Activity.
- Open, add-later and remove controls inside Money activity details.
- Storage cleanup during normal self-service account deletion.
- Existing payment-proof flows remain separate and unchanged.

## Safety boundaries

- Attachments remain optional and require internet; they are not part of the v0.11.11 offline queue.
- The transaction is created before selected files are uploaded, so an upload failure never removes the saved money record.
- Financial values, Account balances, Budget totals and reversals are not changed by attachment actions.
- Firestore metadata writes are server-controlled.
- A file uploaded without valid metadata remains inside the user's private folder and is removed by account-deletion cleanup.

## Staging test gate

Test image/PDF upload, invalid file rejection, 10 MB limit, five-file limit, open, remove, mobile layout, ownership isolation and account-deletion cleanup before production.

## Staging acceptance ? 2026-08-06

The owner completed and approved the full transaction receipt and document-attachment matrix on:

- Staging: https://0586bd9b.bajetbn-staging.pages.dev
- mobile and desktop;
- dark and warm-light themes.

The approved matrix covered optional create-time attachments, add-later uploads, image and PDF support, mobile capture, five-file and file-size limits, invalid-file rejection, open and remove actions, private Storage access, retry handling, offline protection, transaction cleanup, account-deletion cleanup and immediate receipt-count updates.

Attachment actions did not change transaction values, Account balances, Budget totals, ledger effects or reversals. Repeated upload and removal attempts did not create duplicate or inconsistent metadata.

The `data.general_receipts` pre-v1 gate is complete. Production remains governed by the Alpha 2 staging and final production gates.
