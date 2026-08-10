# BajetBN v0.11.12 Final Scope Audit

**Audit date:** 3 August 2026
**Baseline:** v0.11.11 Offline Sync staging-passed
**Candidate:** v0.11.12 Final Scope Audit Alpha 1

## Result

The historic missing capability, general Money activity receipt/document attachments, is implemented in this candidate and moved to a staging-test gate. No agreed pre-v1 requirement remains classified as `missing`.

The product owner explicitly confirmed the v0.11.10 Household/Group Funds and Financial Health matrix and the v0.11.11 Offline Sync matrix passed on staging. Those scope records are now complete.

## Remaining manual gates

- Final production smoke, security, rollback and explicit approval.

## Release decision

Alpha 2 staging acceptance and all required pre-v1 feature matrices are complete. Do not tag v1.0.0 or deploy production until the separate `release.production` gate is explicitly approved.

## 2026-08-03 scope expansion

The owner confirmed that BajetBN will be used for the shop and that both **Standard POS** and **Marketplace Consignment POS** must be included before the first live release. The canonical requirement register records the POS foundation and Standard POS as complete after staging approval. Marketplace Consignment POS Alpha 1 is implemented and awaiting staging approval; returns, refunds, seller payouts and the shop pilot remain open pre-v1 work.

## Brunei localisation staging acceptance

The Brunei institution and payment-method end-to-end matrix passed on 2026-08-06. Both related pre-v1 scope records are complete.

## Recurring-money staging acceptance

The recurring-money scheduler, month-end and duplicate-prevention matrix passed on 2026-08-06. The `recurring.transactions` pre-v1 scope record is complete.

## Transaction-receipt staging acceptance

The transaction receipt and document-attachment matrix passed on 2026-08-06. The `data.general_receipts` pre-v1 scope record is complete.

## Alpha 2 staging acceptance

The final mobile and desktop release smoke test passed on 2026-08-06. The `release.alpha2_staging` pre-production scope record is complete.

Production remains NO-GO pending final CI, security, production smoke, rollback and explicit product-owner approval.


## 2026-08-07 discussion-to-code reconciliation

A later project-history audit found that the original `core.theme` item covered only Dark, Light and device appearance. The previously discussed signed-out theme chooser and expanded preset collection were not represented in the 58-item register.

`core.theme_presets_login` is now a separate pre-v1 staging gate. Production remains blocked until this new scope item and the remaining discussion-to-code reconciliation are complete.
