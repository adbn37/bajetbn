# BajetBN Pre-v1.0 Scope-Completion Audit

**Audit date:** 3 August 2026
**Audited baseline:** BajetBN v0.11.12 Final Scope Audit Alpha 1
**Source basis:** the verified v0.11.11 staging baseline plus final scope reconciliation and general transaction receipt/document attachments.

## Decision

BajetBN now matches the majority of the agreed product direction, especially the Space-centred model, core money tracking, shared expenses, invitations, member balances, Trip money, safe record controls, notifications, and dedicated archive pages.

The agreed source scope now has **zero items marked missing**, but BajetBN is not release-approved for v1.0.0. It must not be promoted until the remaining manual staging and pre-production gates are completed.

This audit does not change runtime behaviour. It records the approved scope, current evidence, release blockers, and the order of remaining work.

## Strongly aligned areas

- Personal, Household, SME, Trip, Goal and Custom Spaces.
- Multiple SME Spaces and multiple personal/business Accounts.
- Income, expense, transfer and audited reversal.
- Budgets, savings goals, bills and instalments.
- Calendar, search, reminders, reports, English/Malay and appearance settings.
- Collaboration inside each Space with `/sharing` retained only as a redirect.
- Invitations, roles, optional approvals, proof uploads and WhatsApp coordination.
- Equal, custom and percentage expense splitting.
- Who-owes-whom balances with partial/full member payments.
- Trip money holder, contributions and collected-money spending.
- Safe Archive, Restore, Close, Stop, Delete and Undo foundations.
- Dedicated archive/closed pages introduced in Alpha 2.
- Self-service account deletion with export, recent authentication, a seven-day cooling-off period, cancellation, ownership blockers, shared-history anonymisation and the approved 30-day fresh-account re-registration policy implemented in v0.11.6 source.
- Recurring salary, allowance, rental income, subscriptions and ordinary repeating expenses with pause, resume, skip, stop, month-end scheduling and duplicate-safe automatic posting implemented in v0.11.7 source.
- Scheduled due-soon, due-today, late and goal-date reminders with duplicate prevention, real-time unread counts and optional browser/device delivery implemented in v0.11.9 source.
- New Money activity can be saved on-device offline and replayed with one stable duplicate-protection key; conflicts move to Needs attention in v0.11.11 source.

## Pre-production blockers

These must be completed before the current build is promoted to the public live website as the approved release:

1. **Finish Alpha 2 and v0.11.5 manual staging tests** on mobile and desktop, including every dedicated archive/closed page and every new confirmation dialog.
2. **Deploy and manually verify v0.11.6 account deletion on staging** with disposable password and Google users, ownership-transfer blockers, cancellation, scheduled finalisation, Storage cleanup, retained anonymous shared history and the 30-day re-registration policy.
3. **Deploy and manually verify v0.11.7 recurring transactions on staging**, including scheduler execution, month-end dates, duplicate prevention, Budget effects, pause/resume/skip/stop and closed Account/archived Space safeguards.
4. **Deploy and manually verify v0.11.9 background reminders on staging**, including scheduled generation while the app is closed, duplicate prevention, preference handling, goal reminders, optional device delivery and blocked-permission behaviour.
5. **Complete the final production approval gate**, including a clean CI run, security review, production smoke test and rollback readiness.

The browser-native confirmation, version-source, CI-coverage and Firebase Functions dependency-review findings were closed in v0.11.5. The account-deletion source implementation is documented in `ACCOUNT_DATA_DELETION_ALPHA.md`; it remains a staging-test gate until the scheduled backend flow is proven end to end.

## Required scope gaps before v1.0.0

### Background notification staging approval

The v0.11.9 source creates reminders from scheduled Functions and can optionally deliver browser/device notifications. This remains a manual staging gate until scheduler timing, deterministic duplicate prevention, permission handling, token cleanup and service-worker notification clicks are proven end to end.

### Optional Household/general group fund

v0.11.10 source extends the proven Trip-money flow to optional Household and Custom Space funds. Direct member-to-member payment, proof upload and who-owes-whom flows remain available. This item is now a staging-test gate for permissions, duplicate retries, contribution reversal and mobile use.

### Brunei account and payment presets

Common Brunei institutions and clear payment-method choices are implemented in v0.11.8 source, including custom provider/method entries and backward compatibility. This item remains a staging-test gate until the forms and generated records are verified end to end.

### SME essentials

v0.11.10 source adds a selected-SME report with money in, money out, a simple profit check, current balances for accounts used by that SME and payments due during the next 30 days. It remains a staging-test gate because Accounts stay independent and the explanation must be clear in real use. Advanced BusinessBajetBN remains deferred.

### Financial-health insights

v0.11.10 source adds savings rate, budget pressure, emergency-fund progress, regular-payment load, category changes and simple next steps. It remains a staging-test gate until calculations, empty states, English/Malay wording and mobile layouts are approved with realistic data.

### Offline financial entry synchronisation

v0.11.11 source adds persistent cached reads and a device-local queue for new Money activity. The queue preserves the original duplicate-protection key through retries and moves current-state conflicts to Needs attention. It remains a staging-test gate until offline refresh, reconnect, duplicate prevention, conflict handling, mobile and multi-tab tests pass. Other server-controlled money actions remain online-only and are documented as an intentional alpha boundary.

## Historic roadmap item requiring an explicit v1 decision

The original architecture still records one item that is not implemented:

- General transaction receipt/document attachments.

It must either be implemented before v1.0.0 or explicitly approved as a post-v1 item. It must not disappear silently from the roadmap.

## Deferred after v1.0.0

- Advanced BusinessBajetBN features such as full accounting, invoicing, tax and payroll.
- Paid/fully automated WhatsApp API delivery. The current free manual prefilled-WhatsApp approach remains valid.

## Release rule

Do not tag or announce v1.0.0 until every item in `scope/pre-v1-scope.json` with a `pre_production` or `pre_v1` gate is marked complete, or the user explicitly approves a documented scope change.


## v0.11.12 reconciliation

- The product owner confirmed v0.11.10 Household/Group Funds and Financial Health passed staging.
- The product owner confirmed v0.11.11 Offline Sync passed staging.
- General Money activity receipt/document attachments are implemented and now require staging approval.
- No scope item remains classified as `missing`.
- Production remains NO-GO under `PRODUCTION_READINESS_GATE.md`.

## 2026-08-03 SME POS scope expansion

The canonical register now contains 58 requirements. The SME POS foundation is complete, while Standard POS, Marketplace Consignment POS, POS money posting, returns/payouts and the real shop pilot remain open before production. Use `scope/pre-v1-scope.json` for current counts.
