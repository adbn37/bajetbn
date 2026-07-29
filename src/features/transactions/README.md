# Transactions and ledger foundation

This feature branch introduces the first posted financial workflow:

- Income, expense, and transfer transactions.
- Every transaction links an Account to a Space.
- Money is sent to Cloud Functions as positive integer minor units.
- Cloud Functions validate ownership, Space membership, currency compatibility, and idempotency.
- Account balances and immutable ledger entries are updated atomically.
- Credit-card effects use liability semantics: spending increases the outstanding balance, while payments reduce it.
- Posted records cannot be edited or deleted. Corrections create a new reversal transaction and inverse ledger entries.

Collections used:

- `transactions`
- `ledgerEntries`
- `accounts`
- `financialCommands`
- `spaces`
- `spaceMembers`
