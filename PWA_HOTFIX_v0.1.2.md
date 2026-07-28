# BajetBN v0.1.2 PWA Cache Hotfix

This patch replaces the all-or-nothing service-worker installation used in
v0.1.1.

## Fixes

- Treats `index.html` and the exact Vite-generated JavaScript/CSS files as
  required application-shell assets.
- Caches optional icons/screenshots separately so one optional file cannot
  block service-worker activation.
- Matches cached static files by URL pathname, avoiding query-string mismatch.
- Provides SPA navigation fallback for `/login`, `/accounts`, `/spaces`, and
  other routes while offline.
- Stops intercepting unrelated same-origin requests injected by DevTools or
  browser extensions.
- Generates `dist/precache-manifest.json` for verification.

Production deployment remains blocked until the offline staging test passes.
