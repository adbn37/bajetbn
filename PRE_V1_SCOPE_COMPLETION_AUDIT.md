# BajetBN Pre-v1.0 Scope-Completion Audit

**Audit date:** 31 July 2026
**Audited baseline:** BajetBN v0.11.5 Release Safety Hardening Alpha 1
**Source basis:** the verified v0.11.4 Alpha 2 staging baseline plus v0.11.5 release-safety hardening.

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

## Pre-production blockers

These must be completed before the current build is promoted to the public live website as the approved release:

1. **Finish Alpha 2 and v0.11.5 manual staging tests** on mobile and desktop, including every dedicated archive/closed page and every new confirmation dialog.
2. **Implement user account and personal-data deletion**, with clear retention rules for shared and financial history.
3. **Complete the final production approval gate**, including a clean CI run, security review, production smoke test and rollback readiness.

The remaining browser-native confirmation, version-source, CI-coverage and Firebase Functions dependency-review findings were closed in v0.11.5. See `RELEASE_SAFETY_HARDENING_ALPHA.md`.

## Required scope gaps before v1.0.0

### Optional Household/general group fund

Trip money is implemented, but collected-money handling is limited to Trip Spaces. The agreed Household/group model requires an optional fund that can be enabled where useful without forcing every family or group to use a wallet.

### General recurring transactions

Recurring bills and instalments exist. Ordinary recurring income/expense templates—salary, rent income, subscriptions and similar repeat transactions—are not represented in the transaction model.

### Brunei account and payment presets

BND and Brunei examples are present, but the Account form still relies mainly on free text. BajetBN needs simple presets for common Brunei institutions/providers and clear local payment-method choices while retaining an “Other” option.

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
