# BajetBN v1.3.0 SME POS Barcode Inventory Alpha 1

This phase adds barcode inventory tools to SME Spaces without mixing SME stock with Collection Space records.

## Included

- Reuses the Android-tested camera scanner for Standard POS products and Marketplace seller listings.
- Finds existing active stock by camera scan, USB scanner, or typed barcode.
- Prefills an unknown barcode when an owner or manager creates a new product or listing.
- Prevents duplicate barcodes within the same POS mode, including archived records.
- Receives stock through an explicit transactional confirmation for owners, managers, and stock staff.
- Keeps stock lookup safe: scanning an existing barcode never changes quantity automatically.
- Keeps absolute stock correction separate from receiving.

## Role boundaries

- Owner and manager: add or edit barcode-linked products/listings, receive stock, and correct stock.
- Stock staff: find records, receive stock, and correct stock without seeing protected cost or commission data.
- Viewer and seller: find records available to their existing POS role, without stock mutation access.
- Cashier barcode-to-cart checkout remains deferred to Alpha 2.

## Deferred

- Alpha 2: scan products and listings directly into checkout with existing hard stock limits.
- Alpha 3: barcode stocktake, return scanning, label printing, and consignment receiving workflows.
