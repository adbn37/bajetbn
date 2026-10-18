# BajetBN Phase 10.9 — Staging Business workspace code splitting and mobile bundle audit

Release baseline: `06ea2454292117a93c324cc0e67bd06c726165b1`, production Phase 10.8. Staging only.

## Source-level finding

`BusinessHomePage.tsx` eagerly imported POS, marketplace, ADBN integrations, finance Accounts, Bills and reporting workspaces, even when the Business Home overview was the only view needed. The source files for marketplace POS (166 KiB) and Accounts (55 KiB) are particularly large; these source sizes do **not** equal transferred bundle sizes. Standard POS, ADBN and reporting modules add further dependencies. Meanwhile, route-level lazy loading was already established in `App.tsx`, so the targeted improvement is *within* BusinessHome.

## Change

Eleven offscreen Business workspaces are now `React.lazy` imports. Their modules are fetched only when that workspace is selected. A **local** `Suspense` fallback shows a loading message; the rest of the app layout remains intact. The existing component exports, props, Business access checks, financial totals, Firestore calls, audit panel, settlement logic, ADBN/marketplace integrations and scopes are unchanged. The Marketplace tab type remains `import type`.

We intentionally **did not** make sweeping vendor `manualChunks` changes or alter Firebase, Cloudflare cache headers, authentication or offline caching. Under Vite 8 / Rolldown, manual chunking can change evaluation order; it needs separate runtime tests. We did not silence the >500 KiB chunk warning.

## Testing requirements

1. `node scripts/verify-business-bundle-v109.mjs`, `npm run typecheck`, `npm run build:staging`, staging environment verification, older structural gates.
2. `node scripts/audit-first-load-bundles-v109.mjs`; save the report, compare against the production baseline audit. JS chunk totals are *not* what a page downloads on first navigation.
3. Business Home overview / mobile summary and history, Business financial audit and shortcut icons.
4. Switch to every relevant POS inventory, marketplace, sellers, Finance accounts/bills, Reports and ADBN integration tab. Confirm the local loading indicator and that no blank views, lazy loading errors, console errors, missing CSS, permission changes or stale state occur.
5. Other routes: Home, Add Money, Goals, Transactions, Accounts, Spaces, Bills, Reports. Check Android/iOS and desktop with cache-disabled cold and cache-enabled warm navigations.
6. In Chrome DevTools Network, capture **transferred JS**, LCP, first meaningful render, and time to usable form. Compare 3 cold and 3 warm runs at matching network/device conditions.
7. DO NOT create test financial records: staging and production currently share Firebase configuration. If any mismatch, do not promote.

## Known limitations

This phase targets **Business Home**'s eager imports while adding broader bundle insight. It is not proof of speed improvement until the device/network benchmark is run. Home's `MoneyActivityModal` still imports `TransactionsPage` (a large module); isolating it is a separate refactor with high regression risk. The 567 KiB source `global.css` is imported globally; splitting that stylesheet requires a cascade/visual regression audit and is not performed here.
