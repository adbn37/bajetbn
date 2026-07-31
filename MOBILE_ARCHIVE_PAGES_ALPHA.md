# BajetBN v0.11.4 Alpha 2 — Mobile UX and Dedicated Archive Pages

## Included

- Active module pages now keep archived, closed, hidden, and stopped records on dedicated full-page views.
- Added dedicated routes for Archived Spaces, Closed Accounts, Archived Budgets, Previous Goals, Stopped Bills & Instalments, and Hidden Categories.
- Added BajetBN in-app lifecycle confirmation dialogs for archive, close, stop, hide, and permanent-delete actions.
- When permanent deletion is blocked by saved history, the dialog offers the safe Archive, Close, Stop, or Hide action instead.
- Redesigned Overview accounts into compact account tiles with an Add Account tile.
- Money Activity can open with an account filter from Overview or Closed Accounts while keeping closed accounts out of new transaction forms.
- Added compact two-column mobile summaries and account tiles, shorter cards, tighter page spacing, and bottom-sheet modals on narrow screens.

## Safety rules retained

- Financial history is never silently removed.
- Closed accounts keep their last balance and previous money activity.
- Archived budgets and goals keep reporting and progress history.
- Stopped bills and instalments keep payment history.
- Used categories remain hidden rather than being deleted.
- Backend lifecycle functions remain the final authority for permanent deletion.

## Staging requirement

Deploy to staging only, run the automated verification script, and complete the mobile and desktop manual checks before production promotion.
