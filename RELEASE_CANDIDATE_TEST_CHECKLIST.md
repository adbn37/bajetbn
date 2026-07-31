# BajetBN v0.11 Release Candidate Staging Checklist

Use two Google accounts and at least one shared Space. Complete every item on staging before creating a release-candidate tag.

## Sign-in and setup

- [ ] Google sign-in works.
- [ ] Email sign-in works when applicable.
- [ ] New-user setup creates one Personal Space only.
- [ ] Refresh and sign-in again keep the saved profile and preferences.

## Accounts and money activity

- [ ] Create bank, cash, e-wallet, and credit-card test Accounts.
- [ ] Money in changes the selected Account once.
- [ ] Money out changes the selected Account once.
- [ ] Account transfer changes both Accounts once and is not counted as spending.
- [ ] Undo restores the correct Account total and does not create a second undo.
- [ ] Settings → Check my totals reports that every Account matches.

## Budgets, goals, bills, and reports

- [ ] Spending updates the matching budget once.
- [ ] Undo removes that spending from the budget once.
- [ ] Goal progress and undo work.
- [ ] Full and part bill payments work.
- [ ] Reports match Money activity and exclude transfers and undone records.

## Sharing

- [ ] Invite a second user and accept with the exact invited email.
- [ ] Viewer, payer, contributor, admin, and owner access behave correctly.
- [ ] Payment proof image and PDF upload work.
- [ ] Paid using another method does not change an Account.
- [ ] Paid from my Account changes the selected Account once.
- [ ] Duplicate confirmation does not create another payment.
- [ ] Undo payment restores the Account and reopens the amount left.

## Calendar, search, language, and appearance

- [ ] Calendar loads without a technical index message.
- [ ] Late, today, and coming-soon dates are correct in Brunei time.
- [ ] Search finds Accounts, Money activity, bills, goals, and Spaces.
- [ ] English and Bahasa Melayu work after refresh.
- [ ] Dark, light, and device appearance work.
- [ ] Large text does not hide buttons or totals.

## Offline, PWA, and errors

- [ ] Installed PWA opens after the browser is closed.
- [ ] Refresh does not show a blank page.
- [ ] Offline banner appears when disconnected.
- [ ] Saving while offline gives a simple message.
- [ ] A page failure shows Reload page and Go to Overview.
- [ ] A missing Firestore index never exposes a long Firebase URL to normal users.

## Data download and final checks

- [ ] Download my data creates a JSON file.
- [ ] The file contains profile, Accounts, Money activity, bills, goals, and reminders.
- [ ] The file does not contain another unrelated user’s private profile or owned Accounts.
- [ ] GitHub staging validation is green.
- [ ] Firebase Functions build is green.
- [ ] Build-output check confirms multiple JavaScript page chunks.
- [ ] Production remains unchanged.
