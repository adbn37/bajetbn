# BajetBN Production Readiness Gate

## Current decision: NO-GO

The source scope is complete, but manual staging evidence is still required.

### Required before production

1. Alpha 2 archive/closed-page and confirmation-dialog matrix.
2. Disposable-user account deletion, cleanup, cancellation and re-registration matrix.
3. Recurring-money scheduler, month-end and duplicate-safe posting matrix.
4. Brunei institution and payment-method end-to-end matrix.
5. Background reminder scheduler, permission, token and click-handling matrix.
6. Transaction receipt/document attachment matrix.
7. Clean CI, security review, production smoke test and rollback drill.
8. Explicit product-owner approval.

Production remains blocked until this document is updated to GO with evidence references.

## Added production blocker — SME POS

Production remains **NO-GO** until Standard POS and Marketplace Consignment POS are complete, linked safely to SME money accounts, and pass a real staging pilot for the owner's shop. The v0.11.13 foundation alone does not clear this gate.
