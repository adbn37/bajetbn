# BajetBN coding-agent rules — combined UI UX Pro Max + Taste Skill + Motion

For UI design work, use:
1. `ui-ux-pro-max` for finance UI/UX structure and responsive design guidance.
2. `redesign-existing-projects` from Taste Skill to audit existing components, **not** to force a new visual style.
3. `design-motion-principles` in **audit** mode first, followed by small intentional interaction changes.

Read `docs/BAJETBN_COMBINED_DESIGN.md` before editing any visual component.

## Strict project-specific priorities

1. Fintech accuracy and accessibility outweigh visual novelty.
2. Keep the existing React/Vite/Cloudflare/Firebase stack; do not install React animation libraries unless a use case demonstrably requires them.
3. Preserve money-posting logic, amountMinor integer conventions, Firestore rules, API behavior, offline queue, tenant visibility and BND formatting.
4. Preserve Home Personal/Business switching **and** the separate Space-picker affordances; showing the picker must not switch the overview.
5. Preserve all user themes. Use existing CSS tokens and classes, not hardcoded mockup palettes.
6. Make small scoped changes with reduced-motion behavior and 320px mobile fallback.
7. Audit empty, error, loading, offline, keyboard and touch states. Avoid decorative entry animations on static content.
8. Run typecheck, lint, build and regression verifiers before proposing merge.
9. No automatic pushes, staging deployment, production deployment or backend migrations.

Design system priorities: clear data labels; tabular financial figures; functional navigation; high contrast; visible focus; restrained hover/press feedback; minimal motion on high-frequency actions.

The first-stage visual implementation is `src/styles/design-combined-v1.css`, scoped to the Home page via `bajetbn-design-combined-v1`.
