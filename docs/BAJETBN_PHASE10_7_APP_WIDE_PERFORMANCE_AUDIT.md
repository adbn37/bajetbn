# BajetBN v1.24.0 — Phase 10.7 app-wide performance audit

## Static code findings (based on production commit b709b341)

| Workflow | Current loading behavior | Performance action in this patch | Further audit |
|---|---|---|---|
| Home | Accounts, Space list, selected-account transactions fetched separately | Warm Add Money module, show immediate preparing state | Profile real first interaction time |
| Add Money `/?quick=1` | `loadQuickOptions()` waits for Spaces/categories; large Transactions feature is lazy | Warm module in parallel with options; preparatory dialog gives immediate feedback | Split `MoneyActivityModal` from 5,000-line TransactionsPage in a later patch |
| Goals | 3 parallel Firebase reads (all goals, all Spaces, contributions) before fully rendering | Prefetch on user navigation intent; progressively render goal records before history; no persistent cache | Paginate contributions / query only visible goals if large |
| Transactions | Large 5,000-line route; multiple concurrent reads incl. attachments and per-account transaction queries | Intent-based JS prefetch | Virtualize long lists, avoid whole-history attachment scans, measure sequential latency |
| Accounts | Owner accounts/Spaces fetched then shared account queries per shared Space | Intent-based JS prefetch | Consider authorized server aggregation of shared accounts; avoid N-per-Space requests |
| Spaces | Reads Spaces plus invitations | Intent-based JS prefetch | Add pagination if Space counts grow |
| Budgets, Bills, Recurring, Reports, Calendar, Search, Settings, Business | Lazy-loaded when first visited; some load several datasets | Intent-based JS prefetch | Measure each route, split expensive report/POS components, limit unneeded reads |
| Authentication | Auth callback awaits profile fetch | Not modified (guard / permissions retained) | Instrument cold auth separately; cached profile may be visually useful only if permission-safe |
| Business totals | Existing primary-currency contamination possible | Read-only finance audit and primary-currency guard from Phase 10.7 included | Compare totals with exported ledger, invoice payment linkage, and reversals |

## Safe implementation
- Only prefetch JS on navigation intent, with a limited Home idle warmup for Goals and More.
- Prefetched Goals data is **single-use**, scoped to one user, and expires after 4 seconds; mutations always read fresh.
- Goals can render authoritative goal balances before slower contribution history arrives; no financial write uses the prefetch.
- Add Money download overlaps Firebase requests and provides immediate cancelable feedback; data validation remains unchanged.
- Never cache balances, accounts, invoices, or transaction mutations in a persistent client cache.
- No Firebase rules, schema, transaction writer, or production deploy logic changes.

## Manual Chrome measurements (repeat on staging; do not claim an unmeasured speedup)
1. In Chrome DevTools > Network, enable Disable cache and test each route once cold, then repeat warm.
2. Time from tap to first visual response, then tap to usable controls for `/?quick=1`, `/goals`, `/accounts`, `/transactions`, `/spaces`, `/budgets`, `/bills`, `/recurring`, `/reports`, and `/more`.
3. Test fast Wi-Fi and mobile throttling; record median of 5 runs and slowest outlier.
4. Inspect waterfall for Firebase functions/Firestore calls and JS chunks; run `node scripts/audit-bundle-sizes-v107.mjs` after staging build.
5. Verify Goals create/contribute/undo/close/restore, Add Money save, cross-account transfers, session sign out/in, roles, disconnected network, and mobile low-memory devices.
6. Check that a brief prefetch doesn't show another signed-in user's records and refresh after any Goal mutation fetches fresh records.

## Risk and constraints
Warmup improves navigation/download latency, not Firebase server RTT. No guarantee of sub-100 ms full form on cold starts. Firestore query optimization and bundle splitting require measured data and potentially further patches. Feature remains **staging only** until approval.
