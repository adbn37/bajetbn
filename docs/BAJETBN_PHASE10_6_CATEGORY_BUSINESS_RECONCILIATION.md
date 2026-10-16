# BajetBN Phase 10.6 — Smart icons & Business reconciliation

## Display-only behavior

- Icon matching applies only to transactions whose saved icon is `dots` or absent. Known saved icons are never replaced and an uploaded custom category image still wins in the rendering component.
- Uses the same built-in SVG pack from Phase 10.2 and navigation pack from Phase 10.4. No remote image calls.
- Supports electric, water, internet/telco, utilities, food, vehicle, payroll, rent, invoices, ADBN Tech, and other familiar categories. Unknown names retain dots.
- The category editor suggestion handles electric and water separately for newly chosen icons.
- Business quick actions and timeline gain existing neon SVGs; route behavior remains untouched.
- No Firestore writes, financial mutations, backfills or migrations.

## Why the screenshot totals differ

Screenshot dated 2026-10-16: All-time transaction net BND 629.00. October money in BND 585.00, money out BND 100.00, October net BND 485.00. Difference = BND 144.00.

`BusinessHomePage` filters transactions to status posted and excludes reversals, computes all-time `income - expense`, then separately computes current-month `income - expense` based on the `transactionDate` prefix. The BND 144.00 is mathematically the net contribution of transactions dated **outside the displayed month**, assuming all listed transactions use the Space currency. It is not necessarily a mistake or an opening bank balance.

The read-only reconciliation line adds `Net outside this month = All-time net - This month's net`, to make the accounting basis visible. A Business activity timeline combines posted money transactions and other events such as invoice statuses. Those status events are **not** automatically additional money in/out.

Potential follow-up audit: ensure `listBusinessTransactionsForSpace` is complete, transactions are in the Space currency, and transfer-linked entries are represented consistently. The current BusinessHomePage totals do not explicitly filter out rows using other currencies; Phase 10.6 intentionally does not silently convert or change values. An all-time total is **not** an actual bank/account balance.

## Staging checks

1. Generic Electric transaction shows the Electric neon SVG on Home, Transactions and the Business timeline.
2. Explicit, recognized saved icon remains unchanged, and custom uploaded category image still takes priority.
3. Known income/expense transaction details, amounts and account balances remain unchanged.
4. Business summary shows October net BND 485 and outside-month net BND 144 with all-time BND 629 for the supplied screenshot's data, if underlying records remain unchanged.
5. Business actions and timeline icons display correctly on mobile and desktop.
6. Verify production does not change until explicit release promotion.
