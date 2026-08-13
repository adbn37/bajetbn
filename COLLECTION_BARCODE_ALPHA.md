# BajetBN v1.1.0 - Collection Barcode Inventory Alpha 1

Collection inventory remains inside BajetBN as a dedicated Collection Space. It is not a separate application.

## Included

- Collection Space type for cards, toys, figures, Hot Wheels, plush, accessories, and other collectibles.
- Phone-camera scanning for UPC-A, UPC-E, EAN-8, EAN-13, Code 39, Code 128, and QR codes.
- Manual barcode entry for desktop scanners or unreadable labels.
- Scan workflow: a known active barcode increases quantity by one; an unknown barcode opens a prefilled item form.
- Internal collection codes stored alongside existing manufacturer barcodes.
- Code 128 and QR label generation with batch printing.
- Name, category, brand, series, variant, condition, quantity, storage location, cost, estimated value, notes, and tags.
- Search across item details, storage location, internal code, and all saved barcodes.
- Safe archive and restore. Collection items are never deleted directly from the client.
- Space membership permissions, deletion protection, account-deletion cleanup/anonymisation, and user-data export coverage.

## Staging checks

1. Create a Collection Space and open Collection inventory.
2. Add an item without a manufacturer barcode and print its Code 128 and QR labels.
3. Scan the printed label using a phone and confirm quantity increases by one.
4. Scan an existing UPC/EAN and save the unknown item form.
5. Scan that UPC/EAN again and confirm the saved item is found.
6. Search by name, barcode, internal code, brand, and storage location.
7. Archive an item, confirm scanning does not change its quantity, then restore it.
8. Confirm viewers cannot create, edit, increment, archive, or restore items.
9. Confirm an archived Collection Space is view-only.
10. Confirm a Collection Space containing items cannot be permanently deleted.
11. Download user data and confirm `collectionItems` is included.

Bulk stocktake sessions, storage-location scanning workflows, photos, external product lookup, and duplicate resolution remain future phases.
