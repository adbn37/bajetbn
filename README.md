# BajetBN v0.11.6 — Account Deletion and Re-registration Alpha 2

BajetBN is a budget tracker and modular life-management platform designed around **Spaces**. Accounts exist independently; future Transactions connect Accounts to Spaces.

> Staging first. Do not deploy this package to production until the staging environment has been tested and approved.

## Included

- React + Vite + TypeScript foundation
- Responsive application shell
- Collapsible desktop sidebar and mobile drawer
- Firebase Authentication foundation: Google and email/password
- Email verification route
- Onboarding with BND and Asia/Brunei defaults
- Idempotent Personal Space creation through Cloud Functions
- Space create, edit, and archive foundation
- Account create, edit, and archive foundation
- Server-controlled, idempotent opening-balance posting
- Minimal posted ledger entry for each opening balance
- Firestore and Storage rules
- Self-service account deletion with recent authentication and a seven-day cooling-off period
- 30-day automatic re-registration cooldown after completed normal deletion, with manual review only for security restrictions
- Required data export and cancellation before processing
- Shared-Space ownership transfer and Trip-fund-holder safety blockers
- Scheduled Auth, Firestore and Storage cleanup with anonymised shared financial history
- Firebase emulator configuration
- PWA manifest and service worker
- Cloudflare Pages staging configuration and SPA redirects
- GitHub staging validation workflow
- Placeholders for the remaining roadmap modules

## Prerequisites

- Node.js 22+
- npm 10+
- Firebase CLI
- Two separate Firebase projects: staging and production
- A separate Cloudflare Pages project for staging

## 1. Install

```bash
npm install
npm install --prefix functions
```

Commit the generated `package-lock.json` files after the first successful install in your development environment.

## 2. Configure staging

```bash
cp .env.staging.example .env.staging
cp .firebaserc.example .firebaserc
```

Fill in the staging Firebase web app values and Firebase project ID. Do not add production credentials yet.

In Firebase Authentication, enable:

- Google
- Email/Password

Add the Cloudflare staging domain to Firebase Authentication → Authorized domains.

## 3. Local staging-mode run

```bash
npm run dev -- --mode staging
```

## 4. Build validation

```bash
npm run typecheck
npm run build
npm run build --prefix functions
```

## 5. Emulator validation

```bash
firebase use staging
npm run firebase:emulators
```

Test:

1. Register with email/password.
2. Verify the email.
3. Complete onboarding.
4. Confirm exactly one Personal Space is created, including after repeated callable requests.
5. Create BIBD, Baiduri, and Cash accounts.
6. Confirm each opening balance creates one posted ledger entry.
7. Retry the same idempotency key through the emulator and confirm no duplicate Account or ledger entry.
8. Create and archive a non-Personal Space.
9. Confirm the Personal Space cannot be archived.
10. Verify mobile drawer and desktop sidebar behavior.

## 6. Deploy Firebase staging resources

```bash
firebase use staging
npm run deploy:rules:staging
npm run deploy:functions:staging
```

This deploys only Firebase staging resources. It does not deploy the web app to production. v0.11.6 changes both Firestore rules and Firebase Functions, so deploy both before testing account deletion.

## 7. Cloudflare Pages staging

Create a dedicated Cloudflare Pages project connected to the `staging` branch:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: `22`
- Environment variables: copy the values from `.env.staging`

`public/_redirects` provides the SPA fallback.

## Data model foundation

```text
users/{uid}
spaces/{spaceId}
spaceMembers/{spaceId_uid}
accounts/{accountId}
accountAccess/{accountId_uid}
ledgerEntries/{entryId}
financialCommands/{uid_idempotencyKey}
```

Money is stored in integer minor units. Account opening balances are posted by a callable Cloud Function and recorded as immutable ledger entries. Direct client writes to Accounts and ledger entries are denied.

## Known Phase 1 boundaries

- Transactions beyond opening balances are placeholders until v0.5.0.
- Shared invitations and role changes are intentionally deferred.
- Receipts and document uploads remain denied until v0.8.0 rules are implemented.
- Offline mutation queues are deferred to v0.9.0.
- Production deployment configuration is intentionally incomplete.

## Staging approval gate

Use `STAGING_TEST_CHECKLIST.md`. Production work begins only after every critical item passes and approval is recorded.

## v0.1.1 PWA hotfix

The v0.1.1 build generates `dist/sw.js` after Vite finishes so the exact hashed JavaScript and CSS files are precached. Use `npm run build -- --mode staging` for staging; a plain `npm run build` intentionally uses production mode and requires production environment values.

## Current pre-v1.0 scope governance

The current full-scope comparison is recorded in:

- `PRE_V1_SCOPE_COMPLETION_AUDIT.md`
- `PRE_V1_SCOPE_ROADMAP.md`
- `scope/pre-v1-scope.json`

Run `npm run verify:pre-v1-scope` whenever a requirement is completed, deferred or reclassified. Production and v1.0.0 remain gated by that register.
## Current release metadata

`release.json` is the canonical BajetBN application version and release label. Settings, package metadata, service-worker generation and release verification must match it.

Run the full release gate with:

```powershell
npm run typecheck
npm run build --prefix functions
npm run verify:all-structural
npm run build -- --mode staging
```

See `RELEASE_SAFETY_HARDENING_ALPHA.md`, `PRODUCTION_SMOKE_TEST_CHECKLIST.md` and `PRODUCTION_ROLLBACK_PLAN.md` before any production deployment.

## Account deletion and retention

See `ACCOUNT_DATA_DELETION_ALPHA.md` for the staging workflow and `DATA_RETENTION_AND_DELETION.md` for the implemented retention rules. Use disposable accounts for all deletion tests.
