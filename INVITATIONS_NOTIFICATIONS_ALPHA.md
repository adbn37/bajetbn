# BajetBN v0.11.4 — Invitations, Notifications & Space Completion Alpha 1

This phase keeps collaboration inside Spaces and adds the missing in-app invitation and notification experience.

## Included

- **Invitations for me** on the Spaces page.
- Accept or decline without needing the invite link again.
- Space name, Space type, inviter, access level, and expiry guidance.
- Registered invitees receive an in-app notification when invited.
- A notification bell and `/notifications` centre.
- Mark one notification or all notifications as read.
- Notifications open the matching Space, bill, goal, payment, or invitation.
- Late and coming-soon bills appear under **Needs attention**.
- A single bill can be shared with several members using equal or different amounts.
- Duplicate member shares for the same bill cycle are blocked.
- Goal progress and Trip-money contributions create notifications.
- Trip Spaces use **Close Trip**, while keeping contributions, spending, balances, and payment history.
- Invitations are included in **Download my data**.

## Safety

- Invitation reads are limited to the Space manager or the exact invited email.
- Accepting and declining are idempotent.
- Shared-bill member rows are created together and the bill total is updated once.
- Notification actions do not change financial balances.
- Closing a Trip archives the Space instead of deleting history.

## Staging checks

1. Invite an existing BajetBN email and confirm the bell count increases.
2. Sign in as the invited user and open **Spaces**.
3. Accept one invitation and decline another.
4. Confirm the accepted Space opens immediately.
5. Open `/notifications`, mark one item read, then mark all read.
6. Share one household bill with two or more members.
7. Confirm equal shares add up exactly to the bill amount.
8. Confirm a duplicate share is refused.
9. Add goal progress and a Trip contribution and confirm notifications appear.
10. Close a Trip and confirm it moves to Archived Spaces with its history kept.
