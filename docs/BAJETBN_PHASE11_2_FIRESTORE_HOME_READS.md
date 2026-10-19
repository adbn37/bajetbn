# BajetBN Phase 11.2 — Home Firestore read coalescing (staging only)

**Baseline** `d3db80c7e71ef3a8c0a7f0002ac358fda5fb8430` (production v1.24.0, Phase 11.1+11.1.1).

## Verified source observations

- Dashboard opens with a Spaces read for Home shortcuts, fetches Spaces and custom categories again when preparing Add Money, and reads Spaces again when viewing an activity detail.
- Auth, persistent Firestore multi-tab cache, and offline transaction synchronization are already implemented. This phase **does not change** their initialization, permissions, cache policy, or financial writes.
- The previous build measured Firestore JavaScript as a large part of first load. Request coalescing **cannot** reduce initial SDK bundle bytes; its intended benefit is reducing overlapping Home read work and avoiding a redundant detail lookup for already loaded active Spaces.

## Changes

1. Home-only, owner-scoped *in-flight-only* coalescing for `listSpaces` and `listAllCustomCategories`. Concurrent readers for the same user share the same Promise. On success or failure, that Promise is discarded. Different user IDs are isolated; future reads are fresh.
2. Home activity detail uses a Space label *already loaded in the current Home state* when available. If the Space is not present (e.g., archived), the existing Firestore lookup remains the fallback.
3. The Phase 11.1.1 verifier is updated to accept ONLY the exact deterministic Home read transformation while still comparing the tested Add Money financial source against its approved baseline.
4. No changes to account balance reads, payments, posting, offline queue, Firebase/Auth setup, security rules, or data schema.

## Staging acceptance and measurements

- Run static and behavioral verifier, regressions Phase 11.1.1 and 11.0, TypeScript, full staging build, staging environment check.
- Verify Personal Home after cold/warm reload; Home shortcuts, Trips, Plan Spaces, custom categories, Add Money, Activity Details and amounts. Verify switching between users, logging out/back in, offline PWA, reconnect and retry after failed network read. Test archived Spaces or missing activity Space names.
- Test Business Home and Transactions; verify balances, transfer direction and receipt access; avoid dummy transactions because staging uses the configured backend.
- **Measurements:** same device/network and same owner data, Chrome DevTools Network Disable Cache, 3 cold and 3 warm runs, compare `users`, `spaces`, and category read requests where observable and time to Home usable. Firestore SDK often multiplexes requests, so raw HTTP request count may not equal query count. A functional check does not establish measurable speed improvement.
- Do not promote if a user sees missing/outdated Space labels, missing accounts, failed Add Money options, offline regressions, or worse performance.

## Limitations

- Only overlapping reads are coalesced; if the first request completes before the second begins, a new read is made intentionally to avoid stale caching.
- This is **not** deferred Firestore SDK initialization, bundle compression, or a blanket reduction in billed Firestore reads.
- The existing `AppShell` profile/notification subscriptions are unchanged; future changes there must undergo separate auth/offline safety review.
