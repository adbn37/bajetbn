# BajetBN v1.2.0 Collection Photos and Primary Barcodes Alpha 2

This phase completes visual identity for dedicated Collection Spaces. It does not change SME POS inventory.

## Included

- Phone camera capture and image-file selection from item details.
- Client-side JPEG resizing to a maximum 1600-pixel side, which also removes embedded image metadata.
- Up to six member-visible photos per collection item.
- Primary-photo selection for inventory cards and item details.
- Confirmed photo removal with best-effort Firebase Storage cleanup.
- Primary-barcode selection while retaining every saved barcode for camera and typed search.
- Backward-compatible reads and updates for collection items saved before Alpha 2.
- Photo metadata in user data exports and collection-photo cleanup when an owned Space is permanently removed during account deletion.

## Security and limits

- Only active Collection Space members can read photos.
- Only owners, admins, and contributors can upload or remove photos.
- Storage accepts prepared JPEG files smaller than 5 MB under the scoped collection item path.
- New uploads are rolled back if Firestore metadata cannot be saved.

## Deferred

- SME POS barcode receiving, checkout, stocktake, returns, and consignment labels remain planned for v1.3.0.
