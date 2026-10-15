#!/usr/bin/env node
/* Static sanity checks only; still run TypeScript/build and manually test user journeys. */
import {readFileSync, existsSync} from 'node:fs';
const read = (file) => readFileSync(file, 'utf8');
const checks = [
  ['Home visual feature class', () => read('src/pages/DashboardPage.tsx').includes('bajetbn-design-motion-v3')],
  ['Home icon component wired', () => read('src/pages/DashboardPage.tsx').includes('HomeShortcutSymbol id={shortcut.id}')],
  ['Home actions section wired', () => read('src/pages/DashboardPage.tsx').includes('className="bajetbn-v3-money-actions"')],
  ['Money button uses existing safe handler', () => read('src/pages/DashboardPage.tsx').includes("onClick={() => void openQuickActivity('activity')}" )],
  ['Transfer button uses existing safe handler', () => read('src/pages/DashboardPage.tsx').includes("onClick={() => void openQuickActivity('move')}" )],
  ['Icon component exists', () => existsSync('src/components/HomeShortcutSymbol.tsx')],
  ['CSS imported', () => read('src/main.tsx').includes("import './styles/design-motion-v3.css';")],
  ['Reduced motion included', () => read('src/styles/design-motion-v3.css').includes('prefers-reduced-motion: reduce')],
  ['Mobile nav content clearance included', () => read('src/styles/design-motion-v3.css').includes('padding-bottom: calc(118px')],
];
let errors = 0;
for (const [name, test] of checks) {
  const ok = test();
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}: ${name}\n`);
  if (!ok) errors++;
}
process.exitCode = errors > 0 ? 1 : 0;
