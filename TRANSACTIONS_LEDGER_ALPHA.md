# BajetBN Transactions & Ledger Alpha 1

## Included

- Transaction history page.
- Income, expense, and transfer posting.
- Account-to-Space linkage.
- Atomic ledger-backed balance updates.
- Idempotent Cloud Function commands.
- Currency compatibility checks.
- Credit-card liability balance handling.
- Reversal workflow for posted records.
- Firestore read rules for owner transaction history.
- Composite index definition for transaction history.

## Staging test sequence

1. Post BND 100.00 income to a bank account and confirm the account increases by 10,000 minor units.
2. Post BND 25.50 expense and confirm the account decreases by 2,550 minor units.
3. Transfer BND 10.00 between two BND accounts and confirm one decreases while the other increases.
4. Retry/double-click posting and confirm only one transaction and its expected ledger entries exist.
5. Reverse each transaction type and confirm balances return to their prior values.
6. Confirm the original record is marked `reversed` and a separate `reversal` transaction exists.
7. Confirm different-currency Spaces/Accounts are rejected.
8. Confirm a user cannot read another user's transactions.

Production deployment remains blocked until these checks pass on staging.
