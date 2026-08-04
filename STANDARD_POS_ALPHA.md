# BajetBN v0.11.14 — Standard POS Alpha 1

This release adds the first working shop checkout inside an SME Space. It supports shop-owned products in both Standard POS and Marketplace Consignment POS mode.

## Included

- Product records with category, SKU, selling price, optional cost price and notes.
- Optional stock tracking, low-stock levels and stock reduction at checkout.
- Dedicated Archived POS records page for products and customers, with restore.
- Optional customer records linked to receipts and repeat visits.
- Simple checkout with cart quantities, walk-in or saved customer, discount, payment method, sale date and note.
- Payment must be posted to a selected active business account using the SME Space currency.
- Checkout creates one POS sale, one money-in transaction and one ledger entry exactly once using an idempotency key.
- Receipt view and print action.
- Daily and monthly sales, estimated profit, low-stock count and recent sales.
- Return-safe sale lines record unit price, cost and returned quantity. The actual return/refund workflow remains for the later returns phase.

## Roles

- Owner and Manager: products, customers, checkout and reports.
- Cashier: customers, checkout and reports.
- Stock staff: products and stock.
- View only: read-only shop records and reports.
- Seller: seller tools arrive with Marketplace Consignment POS.

## Safety

- Checkout requires an Active POS and an internet connection.
- Archived products cannot be sold.
- Tracked stock cannot go below zero.
- Discounts must be below the sale subtotal.
- Product, customer, sale, transaction, ledger and account balance updates are server controlled.
- Production remains blocked until Standard POS staging tests, Marketplace POS, returns, payouts, reports and shop pilot testing pass.
