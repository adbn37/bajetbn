# BajetBN v1.15.0 — Finance & Reporting Foundation Alpha 1

This slice introduces the shared **basic cash-flow reporting contract** used by Money Reports.

## Basic cash-flow contract

- Only `posted` `income` and `expense` transactions are counted in Money In / Money Out.
- Transfers are excluded from Money In and Money Out.
- Reversed originals are excluded.
- Posted reversal records are excluded from basic cash-flow totals.
- Duplicate transaction IDs are counted once when Personal and Business report sources are merged.
- Date ranges are inclusive.
- Account, Space and category filters are applied after the basic posted income/expense rule.
- Callable-returned serialized timestamps and Firestore Timestamp objects are both safe for sorting.
- Balances are not cash-flow metrics.

## Deliberately not defined in Alpha 1

Alpha 1 does **not** define accounting Profit & Loss, COGS, seller payable, invoice aging, debt analytics, tax reporting or advanced POS profitability.

Refund / return records continue to follow their canonical transaction records as produced by the existing backend. Their accounting interpretation will be defined by the later accounting/POS roadmap slices rather than being guessed by the Money Reports foundation.

## Migration scope

Only Money Reports moves to the shared metrics module in Alpha 1. Dashboard, Business Accounting and POS remain behaviorally unchanged until their numbers are compared against the same regression fixtures in later slices.
