# BajetBN Production Smoke-Test Checklist

Use this only after staging approval and an explicitly approved production deployment.

## Before deployment

- [ ] Record the production commit and previous known-good commit.
- [ ] Confirm `main` contains only approved staging changes.
- [ ] Run `npm ci`, Functions build, typecheck, `npm run verify:all-structural`, staging-mode build and production-mode build.
- [ ] Confirm production Firebase project and Cloudflare project names before any command.
- [ ] Export or record current Firestore rules, indexes, Storage rules and deployed Functions versions.
- [ ] Confirm the rollback operator has GitHub, Firebase and Cloudflare access.

## Immediately after deployment

- [ ] Open the live site in a clean browser profile.
- [ ] Sign in with a production smoke-test account.
- [ ] Confirm Overview, Spaces, Accounts, Money Activity, Budgets, Goals, Bills & instalments, Calendar, Reports, Notifications and Settings load.
- [ ] Confirm the displayed version matches `release.json`.
- [ ] Create and safely undo one test Money Activity record.
- [ ] Confirm account balance and reversal history are correct.
- [ ] Open dedicated archived/closed pages and restore a test record.
- [ ] Test one invitation using controlled test accounts.
- [ ] Test one shared expense split and one settlement using test data.
- [ ] Confirm mobile navigation, dialogs and account tiles at 390px width.
- [ ] Confirm there are no critical browser-console errors or failed Firebase calls.
- [ ] Confirm the service worker updates and an old cache is removed.

## Approval

- [ ] Product owner confirms the live smoke test passed.
- [ ] Record deployment time, commit, tester and result in the release notes.
- [ ] Keep the previous known-good deployment available until the observation period ends.
