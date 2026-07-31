# Firebase Functions Dependency Review — v0.11.5

**Review date:** 31 July 2026

## Current source baseline

- Node.js runtime: 22
- Functions generation: 2nd Gen
- `firebase-admin`: declared `14.2.0`
- `firebase-functions`: declared `^7.2.0`
- Lockfile-resolved `firebase-functions`: `7.3.0`

## Decision

The current source already resolves a newer 7.x Functions SDK than the earlier deployment that displayed an outdated-package warning. No automatic major/minor dependency change is included in this safety patch because Functions changes require emulator/staging regression and deployment verification.

Before production deployment:

1. Run `npm outdated --prefix functions` in an environment with normal npm registry access.
2. Review Firebase release notes and migration guidance.
3. Apply an upgrade only on a dedicated dependency branch.
4. Build Functions, run the full structural suite, deploy to staging and test callable Functions before production.
5. Keep Node.js 22 and 2nd Gen settings unless an approved migration changes them.

This review closes the audit requirement to investigate the warning; it does not claim that future package updates are unnecessary.
