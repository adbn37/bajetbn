# BajetBN Pre-v1.0 Completion Roadmap

## Baseline gate — v0.11.4 Alpha 2

- Merge the mobile/archive feature into staging.
- Complete mobile and desktop manual testing.
- Fix Alpha 2 defects without opening a new major scope phase.

## v0.11.5 — Release Governance and Safety Hardening

- Replace every remaining native browser confirmation with the BajetBN lifecycle dialog.
- Introduce one release-version source used by Settings, package metadata, build and service worker.
- Require all verification scripts in staging CI.
- Review Firebase Functions dependencies and production deployment warnings.
- Add a production smoke-test checklist.

## v0.11.6 — Account and Data Controls

- Add “Delete my account” request flow.
- Explain what is deleted immediately, anonymised, retained or blocked.
- Protect shared bills, member settlements, audit trails and financial history.
- Add reauthentication, typed confirmation, cooling-off/cancellation where appropriate, and an audited deletion request state.
- Verify data export before deletion.

## v0.11.7 — Recurring Money and Documents

- Add recurring income and expense templates.
- Support pause, resume, skip next, edit future only and stop recurrence.
- Prevent duplicate generated transactions with idempotency keys.
- Decide and implement or formally defer general receipt/document attachments.
- Decide and implement or formally defer offline mutation queue/synchronisation.

## v0.11.8 — Brunei Presets and SME Essentials

- Add common Brunei institution/provider presets with “Other”.
- Add clear local payment-method choices.
- Add a simple SME overview and SME-focused report filter/presentation.
- Keep advanced BusinessBajetBN outside the v1 scope.

## v0.11.9 — Household/Group Funds and Financial Health

- Add an optional Household/general Space fund using the proven Trip-money pattern.
- Keep direct member-to-member payment and proof-only flows available.
- Add savings rate, commitment load, budget pressure and emergency-fund indicators.
- Confirm English/Malay wording and mobile layouts.

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
