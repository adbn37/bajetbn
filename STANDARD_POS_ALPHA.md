# BajetBN v0.11.14 — Standard POS Alpha 2

Alpha 2 separates daily shop work from owner setup and strengthens stock and staff-access safety found during the first staging test.

## Daily POS layout

- `/spaces/:spaceId/pos` is the staff-facing POS workspace.
- Cashiers open directly on **Open Register** with product search, cart, walk-in or saved customer, payment details, checkout and receipt.
- `/spaces/:spaceId/pos/settings` is the owner-only setup page for POS mode, shop and receipt details, payment account, activation and staff roles.
- Owner and Manager can use Register, Products, Customers and Sales & reports.
- Cashier can use Register, Customers and **My recent sales**.
- Stock staff can view products and update quantity and low-stock alerts without seeing cost or profit.
- View only receives sanitized read-only product and customer information.
- Seller is directed to the later Marketplace seller workspace.

## Product and stock safety

- New items use an explicit choice:
  - **Physical product** — quantity is tracked and checkout stops at zero.
  - **Service or unlimited item** — quantity is intentionally not tracked.
- Physical product is the default.
- Out-of-stock products are clearly labelled and disabled in the register.
- Checkout performs a second client check and an authoritative server transaction check.
- Concurrent attempts cannot push tracked quantity below zero.
- The server returns clear **out of stock** or **only N available** messages.


## Returns and refunds in v0.11.16

- Owner or Manager can return selected quantities from a completed sale.
- Partial and full returns restore physical stock without changing service or unlimited stock.
- The customer refund posts once as Money Out from the original business payment account.
- The sale keeps its original receipt, records returned quantities, and updates net sales and estimated profit.
- Duplicate-safe return commands and append-only return records protect financial history.

## Staff privacy and permissions

- Cashier, Stock staff and View only screens use a sanitized callable workspace rather than direct product, customer and sale reads.
- Cashiers see only sales created using their own account and never receive cost or profit fields.
- Stock staff can update only quantity and low-stock alert through a dedicated server action.
- Shop setup and POS role assignment remain owner-only.
- Firestore direct reads of products, customers and sales are limited to the owner and manager as needed; lower roles use role-filtered Cloud Functions.

## Existing Standard POS features retained

- shop-owned products and customers.
- Cart checkout, discounts, payment methods and selected business payment account.
- One duplicate-safe sale, Money In transaction, ledger entry and account balance update.
- Printable receipts.
- Owner/Manager daily and monthly sales, estimated profit and low-stock report.
- Dedicated archived POS records for owner/manager restore.

Standard POS Alpha 2 passed staging. v0.11.16 return/refund handling is implemented and remains under staging approval. Production stays blocked until all POS adjustment tests and shop pilot testing pass.
