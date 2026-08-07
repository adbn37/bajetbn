# BajetBN Single Notification Entry

## Responsive navigation rule

BajetBN uses one visible notification entry point at each screen size.

- Mobile: the bottom-navigation `Alerts` destination is shown.
- Mobile header: no second notification button is shown.
- Desktop: one notification bell is shown in the header.
- Desktop: the mobile bottom navigation is hidden.
- Both entry points use the same `/notifications` page and unread count.
- The diamond notification symbol is replaced with a reusable outline bell.

This is a frontend-only navigation correction. It does not change notification records, reminder generation, Firebase Functions, Firestore rules, Storage rules or financial data.
