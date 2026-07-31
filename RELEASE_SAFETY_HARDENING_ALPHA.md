# BajetBN v0.11.5 — Release Safety Hardening Alpha 1

## Purpose

This phase closes release-governance issues found by the pre-v1 scope audit. It does not add recurring transactions, account deletion, background reminders, offline mutation queues, or richer financial-health reports; those remain in the approved follow-on roadmap.

## Included

- Replaced the remaining browser-native confirmation boxes with BajetBN mobile-friendly dialogs.
- Added one canonical release file: `release.json`.
- Settings and the generated service worker now read the canonical release version.
- Package metadata and lock metadata are verified against the canonical version.
- Added a release-safety structural verifier and made it part of `verify:all-structural`.
- Simplified staging CI so the package-level full structural suite is the enforced source of truth.
- Added production smoke-test and rollback checklists.
- Reviewed the Firebase Functions package/runtime baseline without performing an untested automatic dependency upgrade.

## Safety behaviour

Undo and removal actions now explain what changes and what history remains before the user confirms. This applies to:

- Money Activity reversal
- Goal-progress reversal
- Shared-expense payment reversal
- Trip-money contribution reversal
- Space-member removal
- Shared-bill payment reversal

## Release source

`release.json` is authoritative for the BajetBN application version and release label. `package.json`, `package-lock.json`, Settings, service-worker generation, CI and verification must agree with it.
