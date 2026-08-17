# BajetBN v1.2.0 Collection Details and Quantity History Alpha 1

This phase strengthens the dedicated Collection Space without mixing it with SME POS inventory.

## Included

- Reusable mobile camera barcode scanner component for future Collection and SME POS use.
- Dedicated collection item details route opened by inventory cards and camera search.
- Immutable quantity movement records with reason, note, previous quantity, and next quantity.
- Transactional quantity changes that prevent negative stock and link every change to its movement.
- Existing item edits can no longer silently overwrite quantity.
- Collection movement history included in user data exports, Space lifecycle checks, and account-deletion cleanup.

## Deferred

- Item photos and primary-barcode management are delivered in v1.2.0 Alpha 2.
- SME POS barcode receiving, checkout, stocktake, returns, and consignment labels are planned for v1.3.0.
