# Pre-v1 Manual Verification

Verified on 11 August 2026.

## Theme and signup

- Login theme chooser and theme previews verified.
- Sign-up page has no theme chooser.
- Optional onboarding theme step can be skipped.
- Users are informed that themes remain available in Settings.
- English and Malay introduction text and financial accountability quote verified.
- Automated theme, onboarding and accessibility checks passed.

## Production

- Staging was approved.
- Production was deployed from the approved main branch.
- https://bajetbn.pages.dev/login loads correctly.
- Firebase Authentication configuration works on the production domain.
- English and Malay switching works.
- No configuration-required screen or blocking application errors were found.
- The production release was confirmed by the project owner.

## Environment decision

Staging and production intentionally use the same Firebase project, bajetbn-staging, while Cloudflare Pages uses separate staging and production projects.
