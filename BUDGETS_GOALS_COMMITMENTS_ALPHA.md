# BajetBN Budgets, Goals & Commitments Alpha

This staging-only feature slice adds:

- Space and category budgets with automatic expense consumption
- Monthly and custom budget periods
- Savings goals with immutable contribution and reversal records
- Bills and instalments with recurring due dates
- Server-controlled commitment payments that post an expense and ledger entry exactly once
- Payment reversal support through the existing transaction reversal workflow
- Upcoming, due, overdue, active and completed states
- Dashboard planning summaries

## Financial rules

- Money remains stored in integer minor units.
- Account balances change only through trusted callable functions.
- Commitment payments create posted transactions and ledger entries atomically.
- Posted payments are reversed rather than silently edited or deleted.
- Goal progress is an allocation record and does not change an Account balance.
- Matching budgets are updated by posted expenses and restored by reversals.

## Staging verification

1. Create a monthly category budget and post a matching expense.
2. Confirm budget spent and remaining values update.
3. Reverse the expense and confirm the budget amount is restored.
4. Create a goal, add progress, and reverse a contribution.
5. Create a recurring bill and an instalment.
6. Pay both from a test Account and confirm Account/ledger/transaction/payment records.
7. Reverse a commitment payment and confirm balance and commitment progress are restored.
