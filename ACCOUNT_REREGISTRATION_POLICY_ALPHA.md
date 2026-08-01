# BajetBN v0.11.6 — Account Re-registration Policy Alpha 2

## Approved behaviour

A normal user-requested account deletion does not permanently ban the email address.

1. The account deletion request has a seven-day cooling-off period.
2. After deletion is fully processed, the same email or Google account enters a 30-day re-registration cooldown.
3. When the 30-day cooldown ends, registration is allowed automatically without administrator approval.
4. The registration creates a completely new BajetBN account. Previous Spaces, balances, memberships, invitations and private data are not restored.
5. Shared financial history already retained as **Deleted member** stays anonymised and is not reconnected to the new account.

## Security exceptions

Accounts restricted for fraud, abuse, security concerns or legal hold use `manual_review` instead of the automatic cooldown. Registration remains blocked until an authorised administrator records approval. No public or user-facing approval tool is included in this Alpha; the restriction record is server-only.

## Enforcement

- Completed deletion writes a server-only record to `accountRegistrationRestrictions`, keyed by a deterministic protected email hash. The raw email is not stored in that collection.
- `enforceRegistrationEligibility` checks the authenticated email immediately after Google sign-in, email sign-in or email registration.
- A blocked newly-created Firebase Auth user is removed so the email can be used again when the cooldown or review restriction is resolved.
- `completeOnboarding` repeats the same server check. This prevents a client from bypassing the registration screen.
- After an allowed re-registration, the restriction is marked fulfilled for the new Firebase UID.

## Staging tests

Use disposable users only:

- normal self-deletion creates a 30-day cooldown record;
- registration before the allowed date is blocked with the correct date;
- Google and email/password attempts are both blocked;
- the temporary Auth account is removed after a blocked attempt;
- registration after the allowed date creates a fresh profile and Personal Space;
- old Spaces, balances and memberships are not restored;
- old shared history remains **Deleted member**;
- a `manual_review` record remains blocked until an administrator approves it;
- an active existing account is not blocked by a stale restriction record.
