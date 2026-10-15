# BajetBN Phase 6 stabilization — release and QA gates

**Scope:** UI-only hardening of `feature/combined-design-skills-20261014` after Phase 6.

This is **not** an automatic redesign of financial records. All posted values, selected-account filtering, account permissions, transfer routes, and transaction outcomes continue through existing React/Firebase handlers. The patch does not create a fake "success" screen.

## Changes

- Hide old decorative total-assets graph in the compact Home financial overview. It overlapped the new monthly figures.
- Enlarge selected-account monthly context labels and add meaningful grouping and spacing.
- Preserve details disclosure and existing privacy/visibility toggle.
- Add mobile end-of-page scroll clearance for Personal and Business Home.
- Move the **existing** Money Activity inputs into a dedicated overflow-scrolling wrapper. The original Save/Cancel row stays in the same form but becomes a persistent, non-scrolling footer. No duplicate button, no new submit handler.
- Enlarge Money Activity category icon blocks and labels (existing category definitions and custom icons are kept).
- Respect reduced-motion settings, viewport height changes, and mobile safe areas.

## Technical guardrails

- Only `src/main.tsx` and `src/features/transactions/TransactionsPage.tsx` are edited. Styles and QA script added separately.
- No Firestore / Cloud Functions / schema / business logic changes.
- Runs only on existing v1.24 feature branch; checks Phase 6 prerequisites.
- Adds temp-directory backups and restores on install/verification errors.
- The new scroll wrapper must preserve JSX and can affect descendant selectors. Test all entry types before merging.
- Builds and static checks alone are **not** evidence of correct financial posting.

## Required checks before any staging deployment

1. `node scripts/verify-design-v61.mjs`, `npm run typecheck`, `npm run build`, and `git diff --check` must pass.
2. Test Home on 320, 375, 390, and 440px widths and desktop, both themes. Confirm scrolling reaches the last shortcut/Business card above the bottom navigation.
3. Test Money Out / Money In / Move Money in Personal and a specific Business. Verify account picker, scope context, amount parsing and category selection.
4. Open the numeric keyboard on mobile. Save and Cancel must remain visible above keyboard when possible; the field region must remain independently scrollable and no input obscured.
5. Test correction form, receipt flow, attachments, offline queued state and validation errors. No "transaction saved" view before confirmed backend/offline queue result.
6. Confirm reduced-motion with OS accessibility preference enabled. Transitions must be suppressed.
7. Only after a full staging test, consider PR/merge; do not deploy based solely on these static checks.

## Revert

Installer prints `Recovery copies: <absolute temp folder>`. Stop Vite before restoring. Copy back the two saved sources and remove the new CSS import, CSS, verifier, and doc. Prefer a Git commit before staging once QA passes so you can revert a single change safely.
