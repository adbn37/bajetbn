# BajetBN v0.7.0 Alpha 2 — Shared Bill Payment Finalisation

## Purpose

Alpha 2 connects shared-bill payment claims to the financial ledger and commitment balance while preserving idempotency and an auditable reversal trail.

## Settlement choices

### Paid from BajetBN Account

The assigned member selects one of their own Accounts. When the claim is automatically finalised or approved by the Space owner/admin, the server:

- validates that the Account belongs to the assigned member;
- posts exactly one expense transaction;
- writes exactly one ledger entry;
- updates matching budgets;
- records the shared assignment, payment claim, proof path, payer, and commitment in the transaction;
- reduces the assignment outstanding amount;
- advances or completes the bill/instalment only when the current cycle is fully settled.

### Paid outside BajetBN

The payment settles the assignment and commitment without changing any BajetBN Account balance or ledger. The payment remains visible in Shared Bills, commitment payment history, Space activity, and the audit records.

## Partial payments

An assignment stores assigned, settled, and outstanding minor-unit amounts. A partial payment changes the assignment to `partially_paid`; the remaining amount can be submitted later. A full settlement changes it to `paid`.

## Approval

- `none`: the member submission finalises immediately.
- `owner_approval`: the submission remains `submitted` until an owner/admin confirms or rejects it.

The payer chooses the settlement source before approval. The reviewer cannot replace the payer's Account.

## Reversal

The latest posted shared payment can be reversed by the payer, owner, or admin.

- Account settlement: creates a posted reversal transaction and ledger entry, restores the Account balance, reverses matching budget spend, and reopens the assignment and commitment.
- External settlement: creates an audited shared-payment reversal record and reopens the assignment and commitment without touching Account balances.

Earlier payments cannot be reversed until later payments are reversed first.

## Legacy Alpha 1 claims

An existing `confirmed` Alpha 1 assignment can be completed through **Complete legacy settlement**, where the payer selects the amount and settlement source. This prevents an unlinked legacy claim from silently changing Account balances.

## Staging test expectations

1. Full BND 37 Account payment posts one expense and closes a BND 37 bill.
2. Repeating approval does not post a duplicate transaction.
3. A BND 20 payment against BND 37 leaves BND 17 outstanding.
4. External settlement closes the assignment without changing Account balances.
5. Reversal restores the Account balance where applicable and reopens the correct amount.
6. Transactions display shared-bill remarks and linked references.
