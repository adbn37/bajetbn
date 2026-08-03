# BajetBN v0.11.11 — Offline Sync Alpha 1

## Purpose

BajetBN can already open its application shell without internet. This phase adds a careful offline path for **new Money activity** so a user can record money in, money out, or a transfer when the connection drops.

## What works offline

- Previously opened Firestore information can be read from the persistent browser cache.
- A new Money activity entry can be saved into an IndexedDB queue on the current device.
- The queued entry keeps one stable duplicate-protection key.
- BajetBN retries automatically when the browser reconnects, when the tab becomes visible, and during a periodic online check.
- The same duplicate-protection key is sent on every retry, so a lost response cannot create the same transaction twice.
- The Offline & sync page shows entries that are waiting, syncing, or need attention.

## Conflict handling

The server remains the final authority for balances and permissions. During replay, the existing `postTransaction` Cloud Function checks the current Space, member access, Account state, currency, category and Budget rules.

A temporary connection error keeps the entry in **Waiting**. A permanent validation or permission problem moves it to **Needs attention** instead of silently discarding it. The user can fix the underlying Account, Space, or category and retry, or remove the unsynced local copy.

## Safety boundaries

Only new Money activity is queued in this alpha. The following actions still require internet:

- Undoing a transaction
- Paying a bill or instalment
- Goal contributions
- Shared bill or shared expense payments
- Household, Group, or Trip fund contributions
- Account, Space, Budget, Goal, category, or recurring-template changes
- Receipt and document uploads

Queued entries are stored locally in the browser profile. They do not change an Account balance until the Cloud Function accepts them. A maximum of 100 entries can wait on one device.

Offline storage should be used only on a private or trusted device. Before account deletion on a shared device, sync or remove waiting entries and clear BajetBN site data from the browser. Server-side account deletion cannot remotely erase browser storage on an offline device.

## Cached data warning

While offline, cached balances and lists may be older than the server. The app shows a visible offline banner and does not claim that cached information is current.

## Staging release gate

Before production, verify at minimum:

1. Open BajetBN online once and load Accounts, Spaces, categories and Money activity.
2. Go offline and refresh; the styled shell and cached information remain available.
3. Add one income, one expense and one transfer while offline.
4. Confirm all three appear in Offline & sync and no Account balance changes yet.
5. Reconnect and confirm automatic sync posts each entry exactly once.
6. Refresh and confirm the final Account balances, transaction records and Budget totals are correct.
7. Simulate a lost response/retry and confirm the duplicate-protection key prevents duplicates.
8. Close or archive a referenced Account or Space before replay; confirm the command moves to Needs attention.
9. Fix the conflict and retry, or remove the unsynced copy through the BajetBN confirmation dialog.
10. Repeat on mobile and with two tabs open.

Production remains blocked until this matrix passes.
