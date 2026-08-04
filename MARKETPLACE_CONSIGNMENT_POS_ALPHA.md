# BajetBN v0.11.15 — Marketplace Consignment POS Alpha 1

## Purpose

Marketplace Consignment POS lets one physical SME shop sell items belonging to different independent sellers through one shared register.

The seller belongs to the individual listing or stock batch, not the general product name. Two sellers may list the same item with different prices, quantities, conditions and commission rules without mixing their records.

## Included in Alpha 1

- Seller profiles with contact details and optional linked Seller login.
- Default seller commission using either a percentage or fixed amount per item.
- Seller-owned listings or stock batches with their own seller, name, category, SKU, condition, price, quantity, low-stock alert and commission rule.
- One shared register that can sell items from several sellers in the same checkout.
- Hard stock protection in the browser and trusted Firebase Function transaction.
- Proportional discount sharing across cart lines before commission is calculated.
- Automatic split of every completed line into:
  - final amount after discount;
  - shop commission; and
  - money owed to the seller.
- Seller balance totals and an append-only seller balance entry for every completed sale.
- Full customer payment posted once to the selected SME business account, Money Activity and account ledger.
- Owner/manager reports for gross sales, shop commission, seller money waiting for payout and low stock.
- Seller workspace limited to the seller’s own listings, sale share, balance and balance activity.
- Cashier, stock staff, seller, viewer, manager and owner role filtering.
- Archived seller listings, sellers and customers remain on a dedicated archive page with restore.

## Commission and discount rule

A cart discount is shared proportionally across the listing lines. The listing commission is then calculated from that line’s final amount. This keeps the customer total, shop commission and seller earnings balanced in whole cents.

Percentage example:

- Item price: BND 100.00
- Cart discount allocated to the item: BND 10.00
- Final item amount: BND 90.00
- Shop commission: 3% = BND 2.70
- Seller money: BND 87.30

Fixed-per-item commission is capped by the final line amount so a seller balance cannot become negative after a discount.

## Money treatment

The customer’s full payment enters the selected shop account because the shop physically receives the money. BajetBN separately records the seller portion as money waiting for payout. The shop’s Marketplace earnings are the calculated commission.

Seller payout posting, returns, refunds and balance reversals remain in v0.11.16. Alpha 1 does not mark seller balances as paid.

## Access

- Owner: all Marketplace tools, shop settings, staff roles and reports.
- Manager: register, sellers, listings, stock, customers, sales and operational reports.
- Cashier: shared register, customers and own recent sales; no seller balances or commission reports.
- Stock staff: listing quantity and low-stock updates only.
- Seller: only their linked seller profile, listings, sale share, balance and balance activity.
- View only: read-only permitted listing and customer information.

## Staging gate

This phase remains `manual_test` until staging confirms seller setup, repeated item names across sellers, mixed-seller checkout, stock blocking, commission calculations, seller balance isolation, role restrictions, account posting and mobile layout.

Production remains blocked. v0.11.16 must add returns, refunds, seller payouts and the related report adjustments before the shop pilot.
