# BajetBN v1.15.0 — Linked Recipient Money Alpha 1C

Alpha 1C adds an optional bridge between an already-posted Business payment and the recipient's Personal BajetBN money records.

## Core rule

Business and Personal ledgers remain separate.

A Business salary or Marketplace seller payout is always valid as a Business-side payment whether or not the recipient uses BajetBN.

## Optional recipient link

If the employee or seller is already linked to a BajetBN user:

1. The Business payment posts normally.
2. BajetBN creates a Linked Money offer for the recipient.
3. The recipient gets a notification.
4. The recipient chooses whether to add the payment to Personal Money.
5. If accepted, the recipient chooses one of their own Personal accounts.
6. BajetBN creates a separate Personal income transaction linked to the offer.

If the recipient is not linked to BajetBN, the Business payment remains Business-side only. Signup is never required.

## Privacy

The Business does not see the recipient's Personal accounts, Personal balances or other Personal transactions.

The recipient sees only the payment information needed to recognise the salary or seller payout.

## Financial semantics

- Salary becomes Personal income category Salary when accepted.
- Marketplace seller payout becomes Personal Other income when accepted.
- Accepting a link does not move bank money. It records the already-made payment in the recipient's Personal ledger.
- Declining the link does not reverse or modify the Business payment.
- One source payment can create at most one deterministic Linked Money offer.
- One offer can create at most one Personal income transaction.

## Scope

Alpha 1C supports:
- Business Payroll salary;
- Marketplace seller payout;
- existing BajetBN recipients linked to the employee/seller record;
- external recipients with no required BajetBN signup;
- recipient notification;
- accept / decline;
- recipient-selected Personal account.

Owner Draw, reimbursement, capital contribution and generic Business-to-Personal transfers remain for a later slice after this recipient-link foundation is accepted.
