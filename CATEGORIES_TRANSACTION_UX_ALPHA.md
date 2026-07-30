# BajetBN Categories & Transaction UX — Alpha 2

This staging-only feature slice builds on the verified Transactions and Ledger Alpha 1 checkpoint.

## Included

- 30 synchronized Brunei-friendly default income and expense categories
- Personal, SME/business, and shared category scopes
- Custom category creation, editing, and archiving
- Server-validated category snapshots on posted transactions
- Category icon and colour snapshots so historical transactions remain readable
- Category selection cards in the transaction form
- Projected account-balance preview before posting
- Transaction details view and reversal action
- This-month/all-time, status, Space, Account, category, and text filters
- Monthly top-expense-category summary
- Friendlier Firebase and validation errors

## Data rules

- Built-in categories live in the application catalog and are validated by Cloud Functions.
- Custom categories live in the `categories` collection and are owned by one user.
- Client writes to `categories` are blocked; create/update/archive operations use Cloud Functions.
- Posted transactions store a category snapshot (`categoryId`, name, icon, colour, and scope).
- Archiving or renaming a category does not rewrite historical financial records.
- SME Spaces use business/both categories. Other Space types use personal/both categories.

## Deployment order

1. Validate the feature branch locally.
2. Deploy Firestore rules to Firebase staging.
3. Deploy Cloud Functions to Firebase staging.
4. Test locally against staging.
5. Merge only after approval and allow GitHub Actions to deploy the staging frontend.

Production deployment remains blocked.
