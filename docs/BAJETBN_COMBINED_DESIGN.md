# BajetBN: Combined Design Integration v1

## Sources

- **UI UX Pro Max** — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT): reference for finance-app design rules, density, color consistency, and responsive data hierarchy.
- **Taste Skill / redesign-existing-projects** — https://github.com/leonxlnx/taste-skill (MIT): audit and refine existing UI; not a competing design system.
- **Design Motion Principles** — https://github.com/kylezantos/design-motion-principles (MIT): production polish, motion restraint, and reduced-motion accessibility.

The upstream skills are **design instructions for coding agents**, not application runtime dependencies. Their use does not automatically generate the image-concept screens.

## Design direction

Keep BajetBN's existing brand identity, themes and finance workflows. Do not copy a mockup's violet palette into the production theme. Prefer clarity, explicit financial scope and accurate money over aesthetics.

1. **UI UX Pro Max** — baseline layout, spacing, financial hierarchy, responsive controls.
2. **Taste Skill** — editorial quality check for rhythm, typography, icon consistency and accidental clutter.
3. **Design Motion Principles** — short, meaningful interaction feedback, not cinematic effects.

## Current stage

**Phase 1 (included here):** an opt-in Home-page-only visual layer: numeric readability, focus states, subtle card hover, active-mode refinement, short dialog entrance animation; respects prefers-reduced-motion. It is activated via a Home-only CSS class and one new stylesheet import. No financial logic changes.

**Not yet implemented:** redesign of Money Activity, Goals, Bills, full Desktop, theme studio or bank account pages. Those deserve separate audits and regression tests before changing.

## Safety invariants

- BND amounts retain existing minor-unit integer logic, formatting, and precision.
- Personal / Business overview buttons and *separate* Space-picker arrows retain their existing behavior.
- Spaces remain underlying context; do not promote them back into main navigation.
- Do not change account selection, transfer destination, cross-Space rules, Firestore permissions, receipts, ADBN sync, or offline behavior.
- Avoid auto-fake data and premature success states.
- Keep theme tokens `--accent`, `--surface`, `--text`, etc.; do not hardcode blue/purple.
- Test 320/375/390/430/768/1280px, light/dark/custom themes and keyboard navigation.
- Respect reduced motion; favor performance on lower-end phones.

## Validate in local BajetBN repository

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
npm run verify:structure
```

Then run the project's relevant V1.24 Home and money-context verification scripts from `package.json`. Visual testing, build and release should be completed **before** staging deployment. Production remains untouched unless separately approved.

## Next stage roadmap

1. Audit real Home and Money Activity screenshots at 390px and 1280px for each theme and both Personal/Business modes.
2. Keep only adjustments that improve task completion and clarity; retain context labels even if they reduce visual minimalism.
3. Ship Money Activity refinements behind an independent staging-only review.
4. Reconcile legacy Goals/Space Goals separately from appearance changes.
