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

## v0.11.4 Invitations, Notifications & Space Completion

- [ ] Existing user sees **Invitations for me** on Spaces.
- [ ] Accept opens the joined Space.
- [ ] Decline removes the pending invitation and informs the inviter.
- [ ] Notification bell shows unread count.
- [ ] Notification Centre opens the correct record.
- [ ] Mark one and mark all as read work.
- [ ] Late and coming-soon bills appear under Needs attention.
- [ ] One household bill can be shared with several members.
- [ ] Equal shares total exactly the bill amount.
- [ ] Duplicate shares are blocked.
- [ ] Goal progress and Trip contribution notifications appear.
- [ ] Close Trip keeps all previous history in Archived Spaces.

## v0.11.4 Alpha 2 — Mobile UX and dedicated archive pages

- [ ] Spaces shows active Spaces only and opens `/spaces/archived` from the header button.
- [ ] Accounts shows active accounts only and opens `/accounts/closed` from the header or summary count.
- [ ] Budgets, Goals, Bills & instalments, and custom Categories keep inactive records on their dedicated pages.
- [ ] Restore/Reopen returns a record to the active page without duplicating balances or history.
- [ ] Permanent delete works only for an unused record.
- [ ] A blocked delete explains why and offers Archive, Close, Stop, or Hide instead.
- [ ] No browser-native confirmation appears for module lifecycle actions.
- [ ] Overview account tiles show only icon, account name/provider, and balance.
- [ ] Tapping an Overview account opens Money Activity filtered to that account.
- [ ] Closed accounts remain visible in historical filters but do not appear in new money activity forms.
- [ ] At 320px, 375px, 390px, and 430px widths, there is no horizontal page overflow.
- [ ] Mobile summary cards and Overview account tiles use a compact two-column layout where space permits.
- [ ] Mobile dialogs appear as touch-friendly bottom sheets and all primary actions remain reachable.
- [ ] Desktop archive pages show search, count, preserved details, restore/reopen, and safe delete controls.
