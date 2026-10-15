# BajetBN v1.24 — Money Entry Repair

## Scope
Phase 6.2 targeted repair for the mobile Money Activity form after Phase 6.1 introduced a separate flex-column scroller. The transaction selector appeared as a thin horizontal line rather than three usable options. The underlying React control was present in the code. This patch changes CSS only (plus a stylesheet import), preserving posting, account, Space, and category logic.

### Fixes
1. Prevent shrinking of direct children in `.bajetbn-v61-form-scroll`, particularly the `.transaction-type-picker`.
2. Keep Money Out, Money In, Move Money visible in a 3-column, non-scrollable control with 44px targets and an active state.
3. Keep form fields scrollable independent of the persistent submit footer.
4. Constrain long Business/account display names so they don't collide with balances.
5. Display the Money page's existing summary metrics compactly on mobile. This does **not** change their calculations.

### Not changed
- No new runtime packages, routes, network operations, Firebase credentials, Firestore rules, or financial logic.
- No CSS adjustments to the separate Move Money transaction flow or other dialogs except CSS inherited from existing styling.
- No frontend success event or shortcut behavior changes.

### Required manual browser checks before merge
- 320, 375, 390 and 440 CSS px; Personal and Business modes; light/dark themes.
- Open Add Activity; inspect **Money Out, Money In, Move Money**, change each option, verify category/account fields change appropriately.
- In Business mode select two different Businesses, ensure correct name/account restrictions and no clipped funds/balance text.
- Scroll to bottom; footer stays visible while all form fields can be scrolled above it; repeat with mobile keyboard open.
- Test one staging-safe expense, income, transfer with appropriate permissions and inspect persisted records; verify error and offline cases.
- Verify Money page summary at 320px and 440px; check Accounts, Budgets, Goals unaffected.

### Known release blockers
Static verification and compiler/build checks alone do not prove real transaction entry works. The project has previously reported unrelated ESLint failures. Verify an accurate baseline before attributing lint differences to this CSS change. The production-mode build in this repository has been observed to target `bajetbn-staging`; confirm environment configuration before any deployment.
