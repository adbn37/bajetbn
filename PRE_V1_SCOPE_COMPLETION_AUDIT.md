# BajetBN Pre-v1.0 Scope-Completion Audit

**Audit date:** 1 August 2026
**Audited baseline:** BajetBN v0.11.9 Background Notifications Alpha 1
**Source basis:** the verified v0.11.8 feature baseline plus the v0.11.9 background-reminder implementation.

## Decision

BajetBN now matches the majority of the agreed product direction, especially the Space-centred model, core money tracking, shared expenses, invitations, member balances, Trip money, safe record controls, notifications, and dedicated archive pages.

It is **not yet scope-complete for v1.0.0** and should not be promoted as the finished live product until the pre-production blockers and required pre-v1 gaps below are closed or explicitly reclassified by the product owner.

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

Trip money is implemented, but collected-money handling is limited to Trip Spaces. The agreed Household/group model requires an optional fund that can be enabled where useful without forcing every family or group to use a wallet.

### Brunei account and payment presets

Common Brunei institutions and clear payment-method choices are implemented in v0.11.8 source, including custom provider/method entries and backward compatibility. This item remains a staging-test gate until the forms and generated records are verified end to end.

### SME essentials

SME Spaces, business Accounts and business categories exist. The minimum SME experience still needs a simple business overview: money in, money out, current cash position, upcoming commitments and a basic profit/cash summary. Advanced BusinessBajetBN remains deferred.

### Financial-health insights

Current reports provide useful totals and notes. The agreed financial-health direction needs clearer actionable indicators such as savings rate, budget pressure, emergency-fund progress, recurring commitment load and simple trend warnings.

## Historic roadmap items requiring an explicit v1 decision

The original architecture recorded two deferred items that are still not implemented:

- General transaction receipt/document attachments.
- Offline financial mutation queue with idempotent synchronisation.

These must either be implemented before v1.0.0 or explicitly approved as post-v1 items. They must not disappear silently from the roadmap.

## Deferred after v1.0.0

- Advanced BusinessBajetBN features such as full accounting, invoicing, tax and payroll.
- Paid/fully automated WhatsApp API delivery. The current free manual prefilled-WhatsApp approach remains valid.

## Release rule

Do not tag or announce v1.0.0 until every item in `scope/pre-v1-scope.json` with a `pre_production` or `pre_v1` gate is marked complete, or the user explicitly approves a documented scope change.
