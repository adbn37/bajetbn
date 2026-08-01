# BajetBN v0.11.9 Background Notifications Alpha 1

## Purpose

BajetBN now prepares bill, instalment and goal-date reminders from trusted Firebase Functions even when the web app is closed. The Notification Centre remains the main record of every reminder. Optional device notifications use Firebase Cloud Messaging and the BajetBN service worker.

## What is included

- Scheduled checks every three hours in `Asia/Brunei`.
- Due-soon, due-today and late reminders for active bills and instalments.
- Target-date reminders for active savings goals that are not yet complete.
- Existing user choices for due-soon, late and reminder-days settings.
- New choices for background checks, goal reminders and optional device notifications.
- Deterministic reminder IDs so repeated scheduler or manual checks do not create duplicates.
- Server-written reminder history for every generated reminder.
- Real-time unread counts and Notification Centre updates while the app is open.
- Optional browser/device notifications with invalid-token cleanup.
- A safe “Check reminders now” action for staging and troubleshooting.

## Duplicate safety

A reminder key combines the user, item type, item ID, due date and reminder kind. The notification and its reminder-history record use a deterministic document ID. A retry therefore returns the existing reminder instead of creating another one.

A single due date can still produce useful stages: one due-soon reminder, one due-today reminder and one late reminder. Each stage is created at most once.

## Device notification setup

Device notifications are optional. In-app reminders work without them.

For staging, add the Firebase Web Push public key to the Cloudflare Pages environment:

```text
VITE_FIREBASE_VAPID_KEY=<Firebase Web Push public key>
```

The key is public configuration, not a private server secret. Users must still allow notifications in their browser. Tokens are saved only through trusted callable Functions, are not client-readable, and are disabled when rejected by Firebase or when the user turns device notifications off.

## Staging-only release gate

Before production, verify scheduled generation, manual checking, duplicate prevention, preferences, goal reminders, late reminders, real-time unread counts, optional push delivery, notification clicks, blocked browser permissions and account-deletion cleanup.
