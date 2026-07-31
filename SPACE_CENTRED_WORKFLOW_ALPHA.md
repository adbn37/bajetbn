# BajetBN v0.11.1 — Space-Centred Workflow Alpha 1

## Purpose

Spaces are now the main place where users manage shared money. The standalone Sharing menu has been removed.

## User flow

1. Open **Spaces**.
2. Select a Space card.
3. Use the Space sections:
   - Overview
   - Members
   - Shared bills or Shared expenses
   - Activity
   - Space settings
4. Personal Spaces show a private overview and settings without member tools.

## Compatibility

- Existing collaboration records are not moved or recreated.
- Existing invitation, member, shared-bill, payment-proof and activity collections continue using the same `spaceId`.
- `/sharing` temporarily redirects to `/spaces` so old saved links do not show a broken page.
- Accepted invitations open the joined Space directly.
- Calendar shared-bill links open the correct Space and its shared-bill section.

## Not included yet

This phase does not add permanent deletion, restore, complete Splitwise-style expense splitting, who-owes-whom balances, or the full Trip Wallet. Those remain separate pre-v1.0 phases.
