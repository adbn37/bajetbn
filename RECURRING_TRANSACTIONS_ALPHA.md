# BajetBN v0.11.7 Recurring Transactions Alpha 1

## Purpose

Add ordinary repeating income and expense workflows without mixing them with Bills & Instalments. This phase covers salary, allowance, rental income, subscriptions, household expenses, business costs, and similar repeat transactions.

## User experience

- A dedicated **Recurring money** page is available from the main navigation and Money Activity.
- Users can create income or expense templates using an active Space, Account, category, amount, repeat frequency, next date, and optional end date.
- Supported frequencies are weekly, monthly, quarterly, and yearly.
- Users can edit future occurrences without changing previously posted transactions.
- Active templates can be paused, resumed from a chosen date, skipped once, posted when due, or stopped.
- Stopped and completed templates live on a separate full page and can be restarted.
- Permanent deletion is allowed only for templates that have never produced or skipped an occurrence.

## Financial safety

Each due occurrence is posted by trusted Firebase Functions. It creates:

1. one normal `transactions` record;
2. one matching ledger entry;
3. one deterministic `recurringTransactionRuns` audit record;
4. the relevant Account balance update;
5. matching Budget spending updates for recurring expenses.

This is a duplicate-safe workflow. The deterministic run document uses the template ID and scheduled date. Repeated scheduler execution therefore returns the existing occurrence instead of posting a duplicate.

## Schedule behaviour

- The staging scheduler checks active templates hourly in `Asia/Brunei`.
- Each template retains its own Space timezone for due-date comparison.
- A limited catch-up loop handles short scheduler outages without unbounded work.
- Monthly, quarterly, and yearly schedules preserve the preferred calendar day.
- Templates created on the final day of a month remain month-end schedules, including February.
- Resuming does not silently create every missed transaction; the user chooses the next date.

## Attention state

If the Account is closed, the Space is archived, access is removed, or a currency mismatch is found, the template moves to **Needs attention** and the owner receives an in-app notification. Editing or resuming after fixing the issue returns it to Active.

## Lifecycle protection

- An Account with active or paused recurring money cannot be closed until the templates are stopped or moved.
- A Space with active or paused recurring money cannot be archived until the templates are stopped or moved.
- A custom category used by recurring money cannot be permanently deleted; it can be hidden while existing templates keep their saved category snapshot.
- Account deletion removes private recurring templates and run records while keeping already posted financial history under the existing deletion/anonymisation policy.

## Staging deployment

This phase changes:

- frontend routes and UI;
- Firestore rules and indexes;
- Firebase Functions, including a scheduled function.

After merge to `staging`, deploy Firestore rules, Firestore indexes, and Functions to the staging project. Use disposable staging records to verify duplicate prevention, pause/resume/skip/stop, month-end schedules, budget updates, and account balances.
