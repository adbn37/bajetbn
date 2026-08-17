# BajetBN v1.3.0 SME POS Barcode Operations Alpha 3

This phase completes the first SME barcode workflow across Standard POS and Marketplace Consignment POS.

## Included

- Explicit barcode stocktake with expected quantity, physical count, discrepancy, and optional note.
- Stocktake uses the existing transactional stock update functions and records a distinct activity summary.
- Barcode return lookup finds eligible receipts but never refunds or restores stock until the return is confirmed.
- Printable Code 128 labels for one product/listing or every active record with a barcode.
- Marketplace barcode lookup continues into explicit consignment receiving confirmation.
- Standard and Marketplace roles share the same safe scan semantics.
- Unknown barcodes, items without eligible sales, and barcode rendering errors show clear feedback.

## Safety boundaries

- A scan never mutates stock, refunds money, or changes seller balances by itself.
- Only owner, manager, or stock staff can receive stock, count stock, or print operational labels.
- Only owner or manager can open and confirm returns.
- Existing server-side checkout, return, commission, payout, archived-record, and hard-stock safeguards remain authoritative.

## Release gate

Alpha 3 requires Android camera, manual barcode, stocktake discrepancy, return lookup, label print preview, Standard receiving, and Marketplace consignment receiving tests on staging.
