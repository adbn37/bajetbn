import fs from 'node:fs';

const css = fs.readFileSync('src/styles/global.css', 'utf8');
const preferences = fs.readFileSync('src/contexts/PreferencesContext.tsx', 'utf8');

const requiredCss = [
  "/* v0.11.12 premium dark and warm-light theme refresh */",
  "--bg: #030708;",
  "--surface: #0a0f11;",
  "--accent: #22c5cf;",
  "--bg: #f5f3ee;",
  "--surface: #ffffff;",
  "--accent: #0b9296;",
  ":root[data-theme='light'] .transaction-toolbar-expanded",
  ":root[data-theme='light'] .calendar-item",
  ":root[data-theme='light'] .offline-command-details div",
  ":root[data-theme='light'] .category-teal",
  ":root[data-theme='light'] .report-warning-card",
  ".sidebar a.active",
  "box-shadow: inset 3px 0 0 var(--accent);",
];

for (const token of requiredCss) {
  if (!css.includes(token)) throw new Error(`Missing premium-theme token: ${token}`);
}

if (!preferences.includes("resolvedTheme === 'dark' ? '#030708' : '#f5f3ee'")) {
  throw new Error('Browser theme-color values do not match the refreshed themes.');
}

if (css.includes(":root[data-theme='light'] body { background:radial-gradient(circle at 70% -20%,rgba(15,159,143,.12),transparent 35%),var(--bg); }\n/* v0.11.12 premium")) {
  throw new Error('Premium theme overrides were inserted before the old light-theme rule.');
}

console.log('Premium dark and warm-light theme checks passed.');
