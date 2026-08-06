# BajetBN v0.11.13 — SME POS Foundation Alpha 1

This release starts the shop system inside **SME Spaces**. It does not process live checkout sales yet.

## Included

- Dedicated POS page inside each SME Space
- Owner setup choice between:
  - **Standard POS** for products owned by the business
  - **Marketplace Consignment POS** for products owned by multiple independent sellers
- Shop name, receipt name, receipt message, currency, timezone and optional default business payment account
- Draft, Active and Paused POS states
- Safe POS mode changes:
  - Standard POS may upgrade to Marketplace Consignment POS
  - Marketplace POS may return to Standard POS only when no seller, listing or sale records depend on Marketplace mode
- POS roles separate from general Space roles:
  - Owner
  - Manager
  - Cashier
  - Stock staff
  - Seller (Marketplace mode only)
  - View only
- Owner-controlled assignment of POS roles to active SME Space members
- Ownership transfer keeps the POS owner and access records aligned
- Firestore rules for POS settings, access and reserved future POS collections
- Product, customer, seller, listing, sale and payout collection foundations
- Mobile and light/dark theme support
- Pre-v1 scope register updated so Standard POS and Marketplace Consignment POS remain production blockers until complete

## Data model

```text
smePosSettings/{spaceId}
smePosAccess/{spaceId_uid}
smePosProducts/{productId}
smePosCustomers/{customerId}
smePosSellers/{sellerId}
smePosListings/{listingId}
smePosSales/{saleId}
smePosPayouts/{payoutId}
smePosCommands/{uid_idempotencyKey}
```

All client writes to these POS collections are denied. Setup, status and access changes use trusted callable Cloud Functions.

## Current boundary

This is the foundation only. The following are deliberately not live yet:

- Product creation and stock movement
- Customer creation
- Checkout
- Sales receipts
- Discounts
- Returns and refunds
- Seller listing intake
- Commission calculation
- Seller balances and payouts
- POS reports

These are required before BajetBN v1.0 production because the app will be used in the owner's shop.

## Staging deployment

This release changes:

- Frontend
- Firestore rules
- Firebase Functions

Deploy rules and Functions to `bajetbn-staging`, then deploy the frontend to the staging Cloudflare Pages project. Production remains blocked.

## Real-shop pilot acceptance ? 2026-08-06

The owner confirmed that the staging real-shop pilot passed for both Standard POS and Marketplace Consignment POS.

The approved pilot covered:

- normal and mixed-seller checkout;
- proportional discount allocation;
- stock reduction and stock protection;
- partial returns and full refunds;
- physical-stock restoration;
- refund posting to the original SME payment account;
- seller-balance and commission reversals;
- partial and final seller payouts;
- account, Money Activity, commission and seller-report reconciliation;
- duplicate protection;
- Owner, Manager, Cashier, Stock staff, Seller and Viewer permissions; and
- phone and desktop operation.

The `sme.shop_pilot` pre-production gate is complete. This approval does not authorize production deployment. The remaining pre-production and final release gates must still pass.
