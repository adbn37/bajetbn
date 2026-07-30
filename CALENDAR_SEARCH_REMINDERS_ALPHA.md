# BajetBN v0.9.0 — Calendar, Search & Reminders Alpha 1

## What this phase adds

- A mobile-friendly calendar for bills, instalments, shared bills, and savings-goal target dates.
- Clear sections for **Late**, **Due today**, and **Coming soon**.
- Filters for month, Space, account, and timing.
- A selected-day list so users can see what is planned on one date.
- A global search page covering Accounts, Money activity, Bills & instalments, Goals, and Spaces.
- Search filters for type, Space, account, status, and date range.
- A search box in the desktop top bar and a mobile search button.
- **Mark as reminded** for an in-app reminder record.
- An optional WhatsApp button using the Space WhatsApp number and a ready-to-send message.
- Reminder history stored per user.

## Simple-language rules

User-facing screens use plain words. Examples:

- “Due today” instead of accounting-style due-status wording.
- “Amount still needed” instead of balance terminology.
- “Mark as reminded” instead of recording a reminder event.
- “Undone” instead of reversed.

Technical names may remain inside code and developer documents.

## Data and safety

- Calendar events are read from existing bills, instalments, shared-bill shares, and goal target dates.
- Reminder history is non-financial. It does not pay a bill or change an account balance.
- Reminder history can only be created and read by the signed-in user.
- WhatsApp remains manual: BajetBN opens a ready message and the user presses Send.
- No paid WhatsApp API is used.

## Staging checks

1. Late, today, soon, and later timing is correct.
2. Month, Space, account, and timing filters work.
3. Bills, instalments, shared bills, and goal target dates appear once.
4. Paid shared bills and finished goals do not appear as open reminders.
5. Mark as reminded creates one history record.
6. WhatsApp opens with the expected number and message.
7. WhatsApp is disabled when the Space has no number.
8. Search finds names, notes, payees, categories, institutions, and display IDs.
9. Search filters work without hiding unrelated items incorrectly.
10. Mobile layout remains usable.
11. Existing transaction, budget, collaboration, and report checks still pass.

Production remains blocked until staging is approved.
