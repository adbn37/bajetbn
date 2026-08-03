# BajetBN v0.1.1 Staging Test Checklist

Date tested: ____________________
Tester: ____________________
Staging URL: ____________________
Commit: ____________________

## Critical â€” must pass

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
- [ ] Manifest has 192Ã—192, 512Ã—512, and maskable PNG icons
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

## v0.11.4 Alpha 2 â€” Mobile UX and dedicated archive pages

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

## Pre-v1.0 scope-completion gate

- [ ] Run `node scripts/verify-pre-v1-scope-audit.mjs`
- [ ] Review `PRE_V1_SCOPE_COMPLETION_AUDIT.md`
- [ ] Review every non-complete `pre_production` item in `scope/pre-v1-scope.json`
- [ ] Confirm all Alpha 2 mobile/archive routes and lifecycle actions in the browser
- [ ] Do not merge to production while a pre-production blocker remains open
- [ ] Do not tag v1.0.0 while a required pre-v1 item remains open or lacks an explicit scope decision

## v0.11.5 â€” Release Safety Hardening

- [ ] Settings displays the same version and release label recorded in `release.json`.
- [ ] Money Activity Undo uses a BajetBN dialog and creates a correction record.
- [ ] Goal progress Undo uses a BajetBN dialog and reduces the goal total correctly.
- [ ] Shared-expense payment Undo uses a BajetBN dialog and restores the owed amount.
- [ ] Trip contribution Undo uses a BajetBN dialog and is blocked when the money is already spent.
- [ ] Remove Member uses a BajetBN dialog and preserves previous shared-money history.
- [ ] Shared-bill payment Undo uses a BajetBN dialog and restores the linked account when applicable.
- [ ] No browser-native `confirm()` or `alert()` box appears anywhere in the tested workflows.
- [ ] `npm run verify:all-structural` passes in GitHub staging CI.
- [ ] Production smoke-test and rollback documents are reviewed before any live deployment.

## v0.11.6 â€” Account and Data Deletion

### Deployment and access

- [ ] Deploy `firestore.rules` to the staging Firebase project.
- [ ] Deploy all v0.11.6 Firebase Functions to staging, including the scheduled finalizer and ownership transfer.
- [ ] Confirm a signed-in user can read only their own `accountDeletionRequests/{uid}` record.
- [ ] Confirm clients cannot directly create, update or delete deletion requests, commands, audit records or tombstones.

### Export, authentication and request

- [ ] Use a disposable email/password user and confirm deletion is blocked until a current data export is prepared.
- [ ] Confirm the export gate expires after 24 hours.
- [ ] Confirm an incorrect password cannot submit the request.
- [ ] Confirm the correct password reauthentication, typed `DELETE` and acknowledgement create exactly one pending request.
- [ ] Repeat the submit action and confirm idempotency prevents duplicate requests/audit entries.
- [ ] Repeat the flow with a disposable Google user and confirm the Google reauthentication popup works.
- [ ] Confirm Settings shows the seven-day scheduled date in Brunei time.

### Shared responsibility blockers

- [ ] Confirm deletion is blocked when the user owns a Space with another member record.
- [ ] Transfer ownership to an active member and confirm the former owner becomes an admin and the new owner receives owner controls.
- [ ] Confirm Personal Space ownership cannot be transferred.
- [ ] Confirm deletion is blocked when the user holds Trip money for another ownerâ€™s Space.
- [ ] Change the Trip money holder and confirm the blocker clears.

### Cancellation and finalisation

- [ ] Cancel a pending request and confirm the account, request status and sign-in remain available.
- [ ] Confirm a cancelled request is not processed by the scheduled function.
- [ ] In the staging emulator or with an approved shortened test date, process a due request and confirm Authentication is first disabled, refresh tokens are revoked, the two-hour token-drain gate is respected, and the Authentication record is removed only after data cleanup succeeds.
- [ ] Confirm private profile, Accounts, ledger entries, private Spaces, transactions, budgets, goals, reminders and private uploads are removed.
- [ ] Confirm proof files belonging to the deleted user are removed from Storage.
- [ ] Confirm shared bills, shared expenses, settlements, Trip contributions and Space activity remain readable to other members as `Deleted member` without name/email/proof links.
- [ ] Confirm account totals and who-owes-whom calculations remain unchanged for remaining members.
- [ ] Confirm the minimal `deletedUsers` tombstone and deletion audit are not readable by clients.
- [ ] Simulate a processing failure and confirm the request becomes `failed`, the user is not falsely logged as deleted, and a later retry can complete safely.

### Release gate

- [ ] Run `node scripts/verify-account-data-deletion.mjs`.
- [ ] Run the full structural suite, Functions build and staging web build.
- [ ] Confirm completed normal deletion creates a server-only 30-day re-registration restriction.
- [ ] Confirm email/password and Google registration are blocked before the allowed date.
- [ ] Confirm the blocked temporary Firebase Auth user is removed.
- [ ] Confirm registration after the allowed date creates a completely fresh account.
- [ ] Confirm old private data, Spaces, balances and memberships are not restored.
- [ ] Confirm anonymised shared history remains `Deleted member` and is not reconnected.
- [ ] Confirm a `manual_review` restriction remains blocked until administrator approval.
- [ ] Confirm an existing active account is not blocked by a stale restriction.
- [ ] Do not mark `data.delete_account` complete or deploy to production until every disposable-user test above passes.


## v0.11.7 recurring transactions

- [ ] Create monthly salary, allowance, rental income and subscription templates.
- [ ] Confirm the due occurrence posts one transaction, one ledger entry and one run record.
- [ ] Run the scheduler/callable twice for the same due date and confirm no duplicate transaction.
- [ ] Confirm recurring expenses update matching Budgets exactly once.
- [ ] Pause a template and confirm no transaction is generated.
- [ ] Resume with a chosen date and confirm missed dates are not silently backfilled.
- [ ] Skip next and confirm the Account balance does not change.
- [ ] Edit future amount/account/category and confirm old transactions remain unchanged.
- [ ] Stop a template and confirm it moves to the separate Stopped page.
- [ ] Restart a stopped template from a new date.
- [ ] Confirm delete is allowed only when generated and skipped counts are zero.
- [ ] Verify 31 January monthly -> 28 February -> 31 March month-end behaviour.
- [ ] Close/archive protection blocks Accounts and Spaces with active recurring money.
- [ ] Break Account/Space access and confirm Needs attention plus one notification.
- [ ] Confirm Calendar and Search show the recurring template.
- [ ] Verify mobile cards, forms and action buttons without horizontal scrolling.


## v0.11.8 Brunei banks and payment methods

- [ ] Create Accounts using BIBD, Baiduri, TAIB and Standard Chartered presets.
- [ ] Create Cash, e-wallet and custom-provider Accounts.
- [ ] Edit an older custom Account and confirm its provider name is preserved.
- [ ] Record each standard payment method in Money activity.
- [ ] Record an Other method and confirm a custom label is required.
- [ ] Confirm transaction details and Search show the method/provider.
- [ ] Confirm recurring generated transactions keep their selected method.
- [ ] Confirm bills, shared bills, shared expenses and Trip contributions save the selected method.
- [ ] Verify English/Malay and mobile layouts without horizontal scrolling.

## v0.11.9 Background notifications

- [ ] Deploy `firestore.rules` and all v0.11.9 Functions to staging.
- [ ] Add the Firebase Web Push public key as `VITE_FIREBASE_VAPID_KEY` in the staging Cloudflare Pages environment and redeploy.
- [ ] Confirm Settings shows v0.11.9 and the device-notification status is accurate.
- [ ] Create a bill within the reminder window and run â€œCheck reminders nowâ€.
- [ ] Confirm one due-soon reminder and one reminder-history record are created.
- [ ] Run the check again and confirm no duplicate is created.
- [ ] Change the test date to due today and confirm one due-today reminder is created.
- [ ] Move the due date into the past and confirm one late reminder is created.
- [ ] Disable due-soon reminders and confirm future reminders are not generated.
- [ ] Disable late reminders and confirm late reminders are not generated.
- [ ] Disable background reminders and confirm the manual and scheduled checks create nothing.
- [ ] Create an unfinished goal with a nearby target date and confirm a goal reminder.
- [ ] Mark the goal complete and confirm no new reminder is created.
- [ ] Keep the app open and confirm the unread count updates in real time.
- [ ] Close the app, wait for the scheduled Function, reopen it and confirm the reminder exists.
- [ ] Allow device notifications and confirm a background notification opens the correct BajetBN page.
- [ ] Confirm denied browser permission shows a clear message without breaking in-app reminders.
- [ ] Turn device notifications off and confirm saved device tokens are disabled.
- [ ] Use an invalid/expired token and confirm the Function disables it safely.
- [ ] Complete disposable-account deletion and confirm push-device records are removed.
- [ ] Verify English/Malay and mobile layouts without horizontal scrolling.


## v0.11.10 Household/group funds and financial health

### Optional collected funds

- [ ] Confirm Settings shows v0.11.10 and the matching release label.
- [ ] Open a Household Space and confirm the optional Household fund tab appears.
- [ ] Open a Custom shared Space and confirm the optional Group fund tab appears.
- [ ] Confirm SME, Goal and Personal Spaces do not show a group-fund tab.
- [ ] Set up a Household fund with an active holder and target.
- [ ] Record member contributions using standard and custom payment methods.
- [ ] Retry the same callable request and confirm idempotency prevents duplicate contributions.
- [ ] Create a shared expense paid using collected Household fund and confirm available money reduces once.
- [ ] Confirm the fund holder must be selected as the payer for a fund-paid expense.
- [ ] Confirm an expense is blocked when the collected fund is too low.
- [ ] Undo an unspent contribution and confirm collected/available totals reduce correctly.
- [ ] Confirm undo is blocked after that money has already been spent.
- [ ] Confirm direct member-to-member payment, proof upload and who-owes-whom still work without using the fund.
- [ ] Repeat the main setup/contribution/expense flow for Trip money and confirm backward compatibility.

### Financial health and SME reports

- [ ] Record income and expenses for two months and confirm the savings rate.
- [ ] Confirm a negative money-left month is clearly shown as needing attention.
- [ ] Add budgets below 75%, near 100% and over 100% and confirm the pressure states.
- [ ] Add weekly, monthly, quarterly and yearly commitments and verify the monthly estimate.
- [ ] Confirm regular-payment load compares the monthly estimate with the selected monthâ€™s income.
- [ ] Create an Emergency fund or Dana Darurat goal and confirm its progress is detected.
- [ ] Confirm the no-emergency-goal state suggests creating one without blocking the report.
- [ ] Confirm category changes compare the selected month with the previous month.
- [ ] Confirm no financial-health card claims to be a credit score or investment advice.
- [ ] Select an SME Space and confirm money in, money out, simple profit check, current cash position and next-30-day payments.
- [ ] Confirm the SME cash explanation says an Account may also be used elsewhere.
- [ ] Verify English/Malay wording, dark/light mode and mobile layouts without horizontal scrolling.

## v0.11.10 Household Fund setup guard hotfix

- [ ] Before setup, Add contribution is visibly disabled.
- [ ] A simple setup-first message appears below the actions.
- [ ] The contribution modal cannot open before setup.
- [ ] Setup cannot be saved without an active money holder.
- [ ] Removing or suspending the selected holder blocks new contributions.
- [ ] A direct callable attempt before setup returns failed-precondition and creates no contribution, activity, or notification.
- [ ] After valid setup, contributions work and update the fund exactly once.
- [ ] Household, Group, and Trip fund flows remain compatible.


## v0.11.11 Offline Sync

- [ ] Confirm Settings shows v0.11.11 and the Offline Sync release label.
- [ ] Open Accounts, Spaces, categories and Money activity online at least once.
- [ ] Turn internet off, refresh, and confirm the styled application shell opens.
- [ ] Confirm the offline banner says cached information may be older.
- [ ] Add one income, one expense and one transfer while offline.
- [ ] Confirm each entry appears under Offline & sync and no Account balance changes yet.
- [ ] Close and reopen the browser while still offline; confirm queued entries remain on this device.
- [ ] Restore internet and confirm automatic sync starts without manual refresh.
- [ ] Confirm each entry posts exactly once and disappears from the local queue.
- [ ] Confirm final Account balances, ledger entries and matching Budget totals are correct.
- [ ] Simulate a response loss or repeated retry and confirm the duplicate-protection key prevents duplicates.
- [ ] Close/archive a referenced Account or Space before replay and confirm Needs attention.
- [ ] Fix the underlying conflict and Retry; confirm one successful post.
- [ ] Remove an unsynced entry and confirm a BajetBN confirmation dialog is used.
- [ ] Confirm Undo, bills, goals, shared payments and fund contributions still require internet.
- [ ] Open two tabs, reconnect, and confirm duplicate-safe results.
- [ ] Verify English/Malay, dark/light mode and mobile layouts without horizontal scrolling.


## v0.11.12 â€” Transaction receipts and final scope audit

- [ ] Attach an image to an income or expense record and open it again.
- [ ] Attach a PDF and confirm the original file name is shown.
- [ ] Reject unsupported files and files of 10 MB or larger.
- [ ] Enforce the five-file limit without leaving unregistered metadata.
- [ ] Remove one attachment and confirm the Storage object and metadata are gone.
- [ ] Confirm a different user cannot read the attachment metadata or Storage file.
- [ ] Confirm attachment controls require internet and do not enter the offline money queue.
- [ ] Confirm account deletion removes transaction attachment metadata and private files.
- [ ] Check mobile layout and long file names.
- [ ] Review `FINAL_SCOPE_AUDIT.md` and keep `PRODUCTION_READINESS_GATE.md` at NO-GO until all remaining gates pass.

## v0.11.12 inline transaction attachment hotfix

- [ ] Save income, expense and transfer without selecting any attachment.
- [ ] Select one image before saving and confirm the transaction and attachment both appear.
- [ ] Select one PDF before saving and confirm it opens from Details.
- [ ] Select several files, remove one before saving, and confirm only the remaining files upload.
- [ ] Confirm Take photo opens the mobile camera/file capture flow on a supported device.
- [ ] Confirm more than five files, unsupported files and files at/over 10 MB are rejected clearly.
- [ ] Simulate an attachment upload failure and confirm the transaction remains saved with Retry attachments.
- [ ] Confirm Finish without remaining attachments closes safely and the existing Details upload remains available.
- [ ] While offline, confirm the transaction can be queued with no file and attachment controls explain that internet is required.
