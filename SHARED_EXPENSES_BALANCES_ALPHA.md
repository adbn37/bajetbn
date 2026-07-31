# BajetBN v0.11.3 — Shared Expenses, Member Balances & Trip Money Alpha 1

This phase completes the first working Splitwise-style flow inside each shared Space.

## Shared expenses

- Record who paid first.
- Select the people included in the expense.
- Split equally, by different amounts, or by percentage.
- The server checks that all shares add up to the full expense.
- A payer's own share is treated as paid immediately.
- Trip expenses paid from collected Trip money are treated as paid by the group fund.

## Who owes whom

BajetBN combines open shares between the same two people. Opposite debts are offset so the page shows one simple amount per pair.

Member repayments can be full or partial. They may require owner/admin confirmation based on the Space setting. Proof may be an image or PDF. Repayments are member-to-member records and do not change bank account balances in this Alpha.

## Trip money

Trip Spaces can record:

- Trip budget
- Person holding the collected money
- Member contributions
- Money collected
- Spending paid from Trip money
- Money still available

Trip money is a group record. It does not move money between bank accounts.

## Safety

- Cloud Functions control all writes.
- Idempotency keys prevent duplicate commands.
- Payment reversal is allowed only when it is still the latest payment for every affected share.
- Space deletion checks include shared expenses, member payments, and Trip contributions.
- Existing financial history is preserved.
