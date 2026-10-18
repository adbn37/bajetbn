# BajetBN Phase 10.7 — Business Financial Audit + Instant-Feeling First Add

Source baseline: `b709b3418b160419008a73a0a2271c92b733f92a` (approved Phase 10.6 production).

## Financial audit
- Business Home owner/manager-only *read-only* audit using the same callable-fetched transactions.
- Calculates month breakdowns, all-time income/expenses/net, non-primary-currency segregation, transfers, reversals, duplicate record IDs, and potentially repeated invoice-payment IDs.
- Existing summary totals now count **only the Business Space currency**, with no currency conversion. No writes or migrations.
- Uses Asia/Brunei to compute the current month rather than UTC (avoids a first-of-month bug during 00:00–07:59 Brunei time).
- Treats potentially repeated invoice payment IDs as *investigation leads*, not confirmed duplicates. Status/invoice events are not automatically posted as income.
- Record-level account reconciliation requires trusted bank statements and actual backend records, not just client summaries.

## First Add Money responsiveness
- Current delay comes from serial fetch of Spaces and custom categories followed by lazy-loading the Money Activity chunk.
- Phase 10.7 warms the chunk and required options after Home settles (without blocking Home's first paint).
- First tap gives a visible cancellable loading sheet if network/options aren't ready. Opening and data requests occur concurrently.
- No transaction-posting changes, account ledger changes, permissions changes or Firebase schema changes. First tap on a slow/offline device may still wait on backend; we do not guarantee 0ms.

## Acceptance
1. Existing Business currency shows same reconciliation as before; test a mixed-currency Business using disposable data and confirm foreign amounts do not enter base-currency net.
2. Month breakdown sums to the displayed net; current month is accurate in Asia/Brunei.
3. Owner/manager can expand the diagnostic; restricted roles cannot.
4. No mutation functions are called from the audit.
5. First Add tap displays immediately responsive UI, opens form after data is ready; cancel before ready does not reopen. Bottom nav `/?quick=1` still opens once and close stays closed.
6. Typecheck, staging build, environment and verification gates all pass. Test mobile dark/light.

## Scope
Staging only. Do not promote until actual totals, permission behavior and quick-add flow pass runtime acceptance.
