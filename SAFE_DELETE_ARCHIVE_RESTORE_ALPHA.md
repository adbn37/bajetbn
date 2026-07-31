# BajetBN v0.11.2 — Safe Delete, Close, Archive & Restore

This phase adds beginner-friendly removal controls without damaging financial history.

## Rules

- Empty, unused records may be permanently deleted.
- Records with saved financial history are closed, stopped, hidden, or archived instead.
- Closed accounts cannot be used for new payments but remain visible in previous money activity.
- The default Personal Space cannot be deleted or archived.
- Bills and instalments with payment history are stopped, not erased.
- Used custom categories are hidden, not erased.
- Removed or paused members and cancelled invitations keep their previous history.
- All destructive actions run through trusted Firebase Functions with duplicate protection.

## User wording

The app uses simple actions: Delete, Archive, Restore, Close account, Stop, Remove member, and Cancel invite.
