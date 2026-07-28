# BajetBN v0.1.1 PWA Hotfix

## Purpose

This staging-only hotfix repairs the failed offline application-shell test from v0.1.0.

## Changes

- Generates a build-aware service worker after every production/staging build.
- Precaches Vite's hashed JavaScript and CSS assets.
- Adds an offline navigation fallback to the React application shell.
- Adds 192×192, 512×512, maskable, and Apple touch icons.
- Adds desktop and mobile screenshots to the web app manifest.
- Adds an offline connection banner.
- Keeps a minimal non-financial profile cache so an already-onboarded user can reach the shell offline.
- Does not cache Accounts, balances, Spaces, receipts, or other financial data in localStorage.
- Adds Cloudflare cache headers for the service worker, manifest, and hashed assets.

## Staging build

```powershell
npm run typecheck
npm run build -- --mode staging
npm run preview -- --host
```

## Required retest

1. Open `http://localhost:4173` online.
2. DevTools → Application → Service workers → Unregister old workers.
3. DevTools → Application → Storage → Clear site data.
4. Reload twice while online.
5. Confirm Cache Storage contains a `bajetbn-shell-v0.1.1-*` cache with `/index.html`, hashed JS, and hashed CSS.
6. Set Network to Offline and refresh.
7. Confirm the BajetBN interface remains styled and shows the offline banner.
8. Confirm cloud-backed data and financial changes are not presented as available offline.

Do not deploy to production until staging passes this retest.
