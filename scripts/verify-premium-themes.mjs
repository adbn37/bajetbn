import fs from 'node:fs';

const css = fs.readFileSync(
  'src/styles/global.css',
  'utf8',
);

const preferences = fs.readFileSync(
  'src/contexts/PreferencesContext.tsx',
  'utf8',
);

const requiredCss = [
  '/* v0.11.12 premium dark and warm-light theme refresh */',
  '--bg: #030708;',
  '--surface: #0a0f11;',
  '--accent: #22c5cf;',
  '--bg: #f5f3ee;',
  '--surface: #ffffff;',
  '--accent: #0b9296;',
  ":root[data-theme='light'] .transaction-toolbar-expanded",
  ":root[data-theme='light'] .calendar-item",
  ":root[data-theme='light'] .offline-command-details div",
  ":root[data-theme='light'] .category-teal",
  ":root[data-theme='light'] .report-warning-card",
  '.sidebar a.active',
  'box-shadow: inset 3px 0 0 var(--accent);',

  '/* v0.11.17 theme preset system */',
  ":root[data-theme='black']",
  ":root[data-theme='pink-white']",
  ":root[data-theme='black-pink']",
  ":root[data-theme='midnight-teal']",
  ":root[data-theme='navy-blue']",
  ":root[data-theme='forest-green']",
  ":root[data-theme='royal-purple']",
  ":root[data-theme='sand-cream']",
  ":root[data-theme='slate-grey']",
  ":root[data-theme='ocean-blue']",
  ":root[data-theme='high-contrast']",
];

for (const token of requiredCss) {
  if (!css.includes(token)) {
    throw new Error(
      `Missing premium-theme token: ${token}`,
    );
  }
}

if (
  !preferences.includes(
    'themeBrowserColors[resolvedTheme]',
  )
) {
  throw new Error(
    'Browser theme-color mapping is missing.',
  );
}

console.log(
  'Premium theme foundation and preset compatibility checks passed.',
);
