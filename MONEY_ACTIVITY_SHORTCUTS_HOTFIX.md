# BajetBN v0.11.12 Money Activity Shortcuts Hotfix

## Purpose

Reduce unnecessary navigation when recording money and managing receipts.

## Overview shortcut

The **Add income or expense** button on Overview now opens the existing Add Money Activity modal directly. Closing or saving keeps the user on Overview. The Money Activity page and its own Add Money Activity button continue to work normally.

## Receipt shortcut

Each normal transaction in **All Money Activity** shows:

- **Add receipt** when it has no attachment.
- **View receipts (n)** when it already has one or more attachments.

The shortcut opens the existing **Receipts & documents** area directly. The separate **Details** action remains available. Reversal-only records do not offer a new upload when they have no attachment.

Receipt upload remains optional. Users can still attach files while creating a money activity or later from full Money Activity Details.

## Data and deployment

Attachment counts are loaded once for the signed-in owner and grouped by transaction in the browser. Existing owner-only attachment rules and upload/remove Functions remain unchanged.

This is a frontend-only hotfix. Firebase Functions, Firestore rules, Storage rules and indexes are unchanged.
