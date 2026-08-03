# BajetBN Data Retention and Account Deletion

This document describes the implemented v0.11.6 technical behaviour. It is a product and engineering policy, not legal advice.

## Principle

BajetBN deletes private data that belongs only to the departing user. It does not rewrite financial outcomes or erase shared records that other users need to understand balances, payments or prior activity.

## Retention categories

| Category | Treatment |
|---|---|
| Authentication identity | Deleted after the data job succeeds |
| User profile and preferences | Deleted |
| Private Accounts and ledger records | Deleted |
| Private Spaces and their private records | Deleted when no shared dependency remains |
| Shared membership | Replaced by a removed anonymous membership |
| Shared bills, payments and settlements | Retained with identifying fields removed |
| Shared expenses and member balances | Retained with a generated anonymous ID |
| Trip-money contributions | Retained without name, email or note |
| Proof-of-payment files | Deleted; retained financial rows no longer reference the files |
| Deletion audit/tombstone | Minimal restricted operational record retained |

## Anonymous identity

A random identifier such as `deleted-<random>` is generated during processing. It is not derived from the user’s UID, email or name. Shared records use this identifier and the label `Deleted member` only where a stable reference is necessary to keep balances and history coherent. Where the original UID was embedded in a shared-record document ID, BajetBN creates a stable hashed replacement ID and updates linked payment, reversal, transaction and activity references.

## Cooling-off and cancellation

The scheduled deletion date is seven days after a valid request. A pending, blocked or failed request can be cancelled. A request cannot be cancelled after processing begins.

## Ownership and fund-holder rules

A user cannot complete deletion while responsible for a shared Space or another owner’s Trip fund. BajetBN explains the blocking Space and provides a route to its details. Ownership can be transferred to an active member from the Members section. The new owner receives owner permissions and the previous owner becomes an admin until deletion is processed.

## Failure handling

The Firebase scheduled function records a safe error message, marks the request failed and retries it on a later schedule. Authentication is first disabled and refresh tokens are revoked. Cleanup waits at least two hours; the Authentication record is deleted only after the main Firestore mutation plan and Storage cleanup have completed. A missing Authentication user is treated as an idempotent success condition.

## Access control

The following collections are server-controlled:

- `accountDeletionRequests`
- `accountDeletionCommands`
- `accountDeletionAudit`
- `deletedUsers`

The signed-in user can read only their own request status. Clients cannot create, update or delete these records directly.

## Re-registration restriction record

BajetBN retains a restricted server-only record keyed by a protected deterministic email hash. It stores the deletion completion date, re-registration eligibility date, policy version and whether manual security review is required. It does not contain the raw email address. For normal self-deletion, the record permits a completely fresh registration after 30 days. It does not reconnect anonymised shared history or restore deleted private records.

## Browser-local offline data

v0.11.11 can store cached Firestore data and unsynced Money activity inside the browser profile on the current device. This browser-local data is not stored in a server collection, so a scheduled server deletion job cannot remotely erase it from a device that is offline or no longer signed in.

Before requesting account deletion on a shared device, the user should sync or remove every item under **Offline & sync**, then clear BajetBN site data from the browser. Offline storage should be used only on a private or trusted device.


## Transaction receipt/document attachments

Transaction attachment metadata is deleted with the user's owned financial data. Files are stored below `users/{uid}/transaction-receipts/` and are removed by the existing user-prefix Storage cleanup during final account deletion.
