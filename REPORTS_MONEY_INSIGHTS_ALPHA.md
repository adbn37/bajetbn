# BajetBN v0.8.0 — Money Reports Alpha 1

## What this adds

The `/reports` page now gives beginner-friendly summaries from existing BajetBN records:

- Money in, money out, and money left
- Comparison with the previous month
- Spending by category, account, and Space
- Budget progress
- Bills paid, still due, late, and instalments left
- Savings-goal progress
- Simple helpful notes
- Filters for month, Space, account, and category

## Simple wording

The page avoids accounting words. It uses phrases such as:

- Money in
- Money out
- Money left
- Still to pay
- Late now
- Simple money check

## How totals are calculated

Only saved, active income and expense records are counted. Transfers, undone records, and undo records are not included in money-in and money-out totals.

Budget progress is calculated from the expense records shown by the selected filters and the dates set on each budget.

A shared payment made from a BajetBN account appears as spending after it creates an account record. A payment made using another method may close a bill, but it does not appear as account spending.

## Alpha 1 limits

- The page calculates reports in the browser from records the signed-in user can read.
- There is no exchange-rate conversion. BajetBN assumes the records use the user's main currency, normally BND.
- There is no PDF, CSV, or scheduled report yet.
- No new Firestore collection, rule, index, Storage rule, or Cloud Function is required.
