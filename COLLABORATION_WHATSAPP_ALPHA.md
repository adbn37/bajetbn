# BajetBN v0.7.0 Collaboration & WhatsApp — Alpha 1

This staging-first feature slice adds collaboration controls for Household, SME, Trip, Goal, and Custom Spaces.

## Included

- Invitation links restricted to the invited email address
- Owner, Admin, Contributor, Payer, and Viewer roles
- Independent permissions for Account use, balance visibility, and ledger visibility
- Active, suspended, and removed member states
- Optional owner/admin approval for member payment claims
- Shared bill assignments linked to existing bills and instalments
- Image/PDF proof of payment uploads to membership-protected Storage paths
- Manual WhatsApp message preparation for notifying the Space head
- Activity history and in-app member notifications
- Removal without deleting historic assignments or activity records

## Important financial boundary

A member marking a shared bill as paid creates a collaboration claim only. It does not post an Account transaction or modify a ledger balance. The Space owner continues to use the existing server-controlled bill payment flow when the actual financial transaction should be posted.

## Collections

- `spaceInvitations`
- `sharedBillAssignments`
- `spaceActivities`
- `userNotifications`
- `collaborationCommands`

Existing `spaceMembers` and `spaces` records receive collaboration fields without deleting existing history.

## Staging acceptance checks

1. Invite a second staging user by email and copy the invite link.
2. Sign in as that exact user and accept the invitation.
3. Confirm the shared Space appears after acceptance.
4. Change the member role and three access permissions.
5. Suspend and reactivate the member.
6. Create an active bill, assign it to the member, and upload payment proof.
7. Test automatic confirmation mode.
8. Test owner/admin approval mode with confirm and reject actions.
9. Open the prepared WhatsApp message and manually press Send.
10. Remove the member and confirm activity and assignment history remain.

Production deployment remains blocked until these checks pass on live staging.

## Alpha 2 payment finalisation

Shared bill claims now support partial/full settlement, a payer-selected BajetBN Account or external payment source, ledger-backed expense posting, commitment closure/advancement, linked transaction remarks, and audited reversal. See `SHARED_BILL_PAYMENT_FINALISATION_ALPHA.md`.
