# BajetBN v0.11.10 Household Fund Setup Guard Hotfix

## Problem

The Add contribution action could look available before the optional shared fund was fully set up. The screen already checked for a fund record, but it did not clearly explain the setup requirement or verify that the selected money holder was still active.

## Fix

- Keeps Add contribution visibly disabled until the fund exists and its selected money holder is active.
- Shows a simple setup-first or holder-attention message.
- Prevents the contribution modal from opening when setup is incomplete.
- Prevents fund setup from being saved without an active holder.
- Repeats the setup and active-holder checks in the Firebase Function.
- Performs all checks before creating a contribution, activity record, or notification.
- Preserves existing Household, Group, and Trip money behavior after valid setup.

## Staging requirement

Use disposable staging data to verify both the normal screen flow and a direct callable attempt. Production remains blocked until the staging checklist passes.
