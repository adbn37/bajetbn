# BajetBN Pre-v1.0 Completion Roadmap

## Baseline gate — v0.11.4 Alpha 2

- Merge the mobile/archive feature into staging.
- Complete mobile and desktop manual testing.
- Fix Alpha 2 defects without opening a new major scope phase.

## v0.11.5 — Release Governance and Safety Hardening — Completed in source

- [x] Replace every remaining native browser confirmation with a BajetBN mobile-friendly dialog.
- [x] Introduce one canonical release source used by Settings, package metadata and service-worker generation.
- [x] Require the full package-level structural suite in staging CI.
- [x] Review Firebase Functions dependencies and production deployment warnings.
- [x] Add production smoke-test and rollback checklists.
- [ ] Complete manual browser testing on staging before merging this phase onward.

## v0.11.6 — Account and Data Controls — Completed in source

Includes the seven-day deletion cooling-off period, safe anonymisation and a 30-day automatic fresh-account re-registration cooldown. Security, fraud, abuse and legal-hold restrictions require manual review.

- [x] Add “Delete my account” request flow.
- [x] Explain what is deleted, anonymised, retained or blocked.
- [x] Protect shared bills, member settlements, audit trails and financial history.
- [x] Add password/Google reauthentication, typed confirmation, seven-day cooling-off, cancellation and audited request states.
- [x] Require a current data export before deletion.
- [x] Add ownership transfer for shared Spaces and Trip-fund-holder blockers.
- [x] Add scheduled finalisation, Firebase Auth removal, Firestore cleanup, Storage cleanup and anonymous shared-history retention.
- [ ] Deploy Firestore rules and Functions to staging and complete the disposable-user test matrix.

## v0.11.7 — Recurring Transactions — Completed in source

- [x] Add recurring income and expense templates for salary, allowance, rental income, subscriptions and regular costs.
- [x] Support pause, resume from a chosen date, skip next, edit future only, stop and restart.
- [x] Prevent duplicate generated transactions with deterministic occurrence records.
- [x] Preserve month-end and preferred-day schedules across short months.
- [x] Update Accounts, ledgers and matching Budgets through trusted Functions.
- [x] Add dedicated active and stopped pages plus Calendar and Search visibility.
- [ ] Deploy rules, indexes and Functions to staging and complete the recurring-transaction test matrix.

General receipt/document attachments and offline mutation synchronisation remain explicit pre-v1 decisions; they were not silently added to this financial scheduling phase.

## v0.11.8 — Brunei Banks and Payment Methods — Completed in source

- [x] Add common Brunei institution/provider presets with “Other”.
- [x] Add clear local payment-method choices and custom methods.
- [x] Keep old custom Accounts and historic records compatible.
- [x] Carry payment methods into normal, recurring, bill, shared and Trip-money records.
- [ ] Deploy Functions to staging and complete the Brunei money-options test matrix.

The simple SME overview remains a separate pre-v1 item and is not silently bundled into this localisation phase. Advanced BusinessBajetBN remains outside v1 scope.

## v0.11.9 — Background Notifications and Reminders — Completed in source

- [x] Generate bill, instalment and goal-date reminders from scheduled Functions while the app is closed.
- [x] Respect due-soon, late, goal and reminder-days preferences.
- [x] Use deterministic reminder keys to prevent duplicate notifications and history records.
- [x] Add optional Firebase browser/device notifications with token cleanup.
- [x] Update unread counts in real time and add a safe manual reminder check.
- [ ] Deploy rules and Functions, configure the staging Web Push public key and complete the notification test matrix.

## v0.11.10 — Household/Group Funds and Financial Health — Completed in source

- [x] Add an optional Household/general Space fund using the proven Trip-money pattern.
- [x] Keep direct member-to-member payment and proof-only flows available.
- [x] Add savings rate, commitment load, budget pressure and emergency-fund indicators.
- [x] Add month-to-month spending changes and beginner-friendly next steps.
- [x] Add a simple SME overview for money in, money out, cash position and upcoming payments.
- [x] Add English/Malay wording and responsive mobile layouts.
- [ ] Deploy changed Functions and complete the v0.11.10 staging matrix.

## v0.12.0 — Scope-complete Beta

- Run the complete audit verifier, staging checklist, security review and multi-user collaboration test.
- Deploy to production as Beta only after explicit approval.
- Observe real use and fix release-blocking defects.

## v1.0.0 gate

- No unresolved required audit items.
- No critical or high-severity security findings.
- Data deletion and export verified.
- Financial reversals and idempotency verified.
- Mobile, desktop, English and Malay smoke tests passed.
- Production rollback and backup procedures documented.
