# BajetBN v0.11.16 — SME POS Returns & Seller Payouts Alpha 1

## Purpose

This phase completes the agreed money flow after a Standard or Marketplace POS sale. It keeps the original sale intact and records every later return, customer refund, seller-balance adjustment and seller payout as a separate audited event.

## Returns and refunds

- Owner and Manager can return selected quantities from a completed sale.
- A sale can be partially returned more than once until every sold unit is returned.
- Returned physical Standard POS products and Marketplace listings are restored to stock.
- Service or unlimited Standard POS items do not gain artificial stock.
- The refund posts exactly once as Money Out from the original business payment account used for the sale.
- A return creates a trusted `smePosReturns` record, Money Activity transaction, account ledger entry and Space activity.
- Sale status moves from `completed` to `partially_returned` or `refunded`.
- Original receipt totals remain visible together with the refunded and net amounts.

## Marketplace balance treatment

- Marketplace returns reverse the returned share of gross sales, shop commission and seller earnings.
- Seller balance activity receives an append-only negative `return_adjustment`.
- A seller balance may become negative when a seller was paid before a later customer return; later earnings reduce that amount safely.
- Owner and Manager can record a seller payout only against a positive available seller balance.
- A payout posts exactly once as Money Out from the selected SME business account.
- A payout creates a trusted `smePosPayouts` record, Money Activity transaction, account ledger entry and negative seller-ledger entry.
- Seller payout history is visible to the owner/manager, while a linked seller sees only their own balance activity.

## Safety

- Return and payout writes are Cloud Function only.
- Client writes to sales, returns, payouts, seller ledgers, transactions, accounts and ledgers remain denied.
- Idempotency keys prevent duplicate refund and payout postings.
- Return quantities cannot exceed the unreturned quantity.
- Payout amount cannot exceed the current positive seller balance.
- Original sale and historical records are never silently deleted or overwritten.

## Staging gate

The v0.11.16 staging matrix passed on 2026-08-06 across Standard POS, Marketplace POS, seller access, mobile and desktop layouts, account balances, Money Activity, returns, refunds, seller-balance reversals, commission reversals, seller payouts and duplicate protection. `sme.pos_money_link` and `sme.pos_returns_payouts` are complete.
