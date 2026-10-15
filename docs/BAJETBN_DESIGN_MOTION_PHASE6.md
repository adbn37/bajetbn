# BajetBN Phase 6 — compact mobile Home + amount-first form

- **Target:** BajetBN 1.24.x, feature/combined-design-skills-20261014, with Phases 1–5 applied.
- **Design systems:** UI UX Pro Max for readable financial hierarchy; Taste Skill for restraint and whitespace; Design Motion Principles for feedback and reduced-motion support.
- **Home change:** place the actual posted selected-account monthly income, expenses, and net-flow figures in the Total Assets hero; collapse only the breakdown detail behind an accessible native `<details>`; place the existing accounts list above the existing money-action toolbar.
- **Semantics:** Total Assets covers personal and permitted shared accounts. Monthly income/expense figures are **only** for the selected account. Avoid interpreting monthly income/expense as the total across Personal/Business.
- **Entry change:** move the existing amount field ahead of the type selector, leaving account, date, category, permissions, validation, offline saving and Firebase transaction posting untouched.
- **Visual:** existing dark/light and user-customized color tokens; larger financial numbers, touch targets, no decorative data or false confirmations.
- **No new backend dependencies.** No automatic Firebase, Cloudflare, staging or production deployment.

## Release checks

1. `node scripts/verify-design-v6.mjs`, `npm run typecheck`, `npm run build`, `git diff --check`.
2. Existing `npm run lint` has unrelated baseline errors. Compare changed-file warnings to prior baseline; do **not** silence entire lint rules.
3. Verify at 320px, 375px, 390px, 440px and desktop 1280px on both themes.
4. Test account visibility/privacy toggle, chosen account switching, negative balance, Personal/Business switching, Money In, Money Out, transfer, offline queue, keyboard interaction, reduced motion, and scroll above the bottom nav.
5. Before staging deployment, check `.env.staging` and actual Firebase project, then obtain approval.
