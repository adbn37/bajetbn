# BajetBN v1.3.0 SME POS Barcode Checkout Alpha 2

This phase adds barcode-to-cart tools to the Standard POS and Marketplace Consignment POS registers.

## Included

- Reuses the Android-tested camera scanner inside both checkout registers.
- Supports camera, USB scanner, and manually typed barcode entry.
- Adds one matched product or seller listing to the current cart per accepted scan.
- Ignores rapid repeated reads of the same barcode for 1.2 seconds.
- Allows a later intentional rescan to add another unit within the available-stock limit.
- Shows clear feedback for unknown, out-of-stock, duplicate, and stock-limit scans.
- Keeps inventory lookup separate: inventory scans still never change stock or cart quantity.
- Keeps checkout safe: stock is deducted only by the existing server-side sale completion functions.
- Keeps existing hard stock guards for Standard and Marketplace sales.

## Role boundaries

- Owner, manager, and cashier roles can scan items into a register cart.
- Stock staff, viewers, and Marketplace sellers keep their existing non-checkout access.
- A paused or setup-only POS disables scan-to-cart.

## Deferred

- Alpha 3: barcode stocktake, return scanning, label printing, and consignment receiving workflows.
