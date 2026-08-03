# BajetBN v0.11.12 Inline Transaction Attachment Hotfix

The Add Money Activity form now includes a receipt/document section before the transaction is saved.

## User flow

- Receipt upload remains optional. A user can save any transaction without selecting a file.
- A user may choose images or PDFs, or take a photo on a supported mobile device.
- Up to five files may be selected, each smaller than 10 MB.
- Selected files can be removed before saving.
- BajetBN creates the transaction first, then uploads and links the selected files.
- The existing attachment controls in Money Activity details remain available for adding files later.

## Failure and offline safety

- If an upload fails after the transaction is created, the transaction stays saved.
- Failed files remain visible in a retry screen with Retry attachments and Finish without remaining attachments actions.
- Offline money activity can still be queued without an attachment.
- Attachments require internet and are never silently added to the offline queue.
- If connectivity fails during posting and the transaction is queued, BajetBN explains that the selected files must be attached later from Details.

## Deployment

This is a frontend-only hotfix. Firebase Functions, Firestore rules, Storage rules and indexes are unchanged.
