# BajetBN v0.1.1 Staging Test Checklist

Date tested: ____________________
Tester: ____________________
Staging URL: ____________________
Commit: ____________________

## Critical — must pass

- [ ] Staging uses the staging Firebase project, not production.
- [ ] Email/password registration works.
- [ ] Email verification is enforced.
- [ ] Google sign-in works.
- [ ] Unauthenticated routes redirect to sign-in.
- [ ] Onboarding creates the user profile once.
- [ ] Onboarding creates exactly one Personal Space.
- [ ] Personal Space membership has owner permissions.
- [ ] Personal Space cannot be archived.
- [ ] Household, SME, Trip, Goal, and Custom Spaces can be created.
- [ ] Non-Personal Spaces can be edited and archived.
- [ ] BIBD/Baiduri/Cash Account creation succeeds.
- [ ] Money is stored in minor units.
- [ ] Opening balance creates exactly one posted ledger entry.
- [ ] Repeated idempotent Account commands do not duplicate financial records.
- [ ] Direct client Account and ledger writes are rejected by Firestore rules.
- [ ] Account opening balance cannot be silently edited.
- [ ] Account can be archived but not deleted.
- [ ] Desktop sidebar collapses and expands.
- [ ] Mobile drawer opens, closes, and dismisses after navigation.
- [ ] SPA routes load correctly after browser refresh on Cloudflare Pages.
- [ ] PWA installs and reloads its application shell.

## Security and environment

- [ ] No secrets are committed to Git.
- [ ] Production Firebase identifiers are absent from the staging build.
- [ ] Storage denies Space receipt uploads in this phase.
- [ ] Firestore fallback rule denies unrecognised collections.
- [ ] Firebase authorised domains include only expected staging domains.
- [ ] Cloud Function region is `asia-southeast1`.

## Approval

- [ ] All critical tests passed.
- [ ] Known non-critical defects are documented.
- [ ] Owner approved production preparation.

Approved by: ____________________
Approval date: ____________________
Notes: ____________________

## v0.1.1 PWA hotfix retest

- [ ] Old service workers and site data cleared before retest
- [ ] New `bajetbn-shell-v0.1.1-*` cache created
- [ ] Hashed JavaScript and CSS files exist in Cache Storage
- [ ] Manifest has 192×192, 512×512, and maskable PNG icons
- [ ] Manifest has wide and mobile screenshots
- [ ] Installed application opens online
- [ ] Styled BajetBN application shell opens after an offline refresh
- [ ] Offline banner is visible
- [ ] Cloud data is not falsely presented as current while offline
- [ ] Reconnection restores cloud data
