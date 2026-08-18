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

  '/* v1.3.0 shared theme contrast hotfix */',
  ':root[data-theme] .button.primary',
  'background: var(--accent-2);',
  ':root[data-theme] .button.secondary',
  'background: var(--surface-2);',
  ':root[data-theme] .empty-state',
  'background: var(--surface-soft);',
  ':root[data-theme] .transaction-toolbar-expanded',
  ':root[data-theme] .planning-card',
  ':root[data-theme] .info-banner',
  ':root[data-theme] .meta-row span',
];

for (const token of requiredCss) {
  if (!css.includes(token)) {
    throw new Error(
      `Missing premium-theme token: ${token}`,
    );
  }
}

const contrastThemes = [
  'black',
  'light',
  'pink-white',
  'black-pink',
  'midnight-teal',
  'navy-blue',
  'forest-green',
  'royal-purple',
  'sand-cream',
  'slate-grey',
  'ocean-blue',
  'high-contrast',
];

function lastThemeBlock(theme) {
  const escapedTheme = theme.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );

  const matches = [
    ...css.matchAll(
      new RegExp(
        `:root\\[data-theme='${escapedTheme}'\\]\\s*\\{([\\s\\S]*?)\\n\\}`,
        'g',
      ),
    ),
  ];

  return matches.at(-1)?.[1] || '';
}

function themeColor(block, token, theme) {
  const value = block.match(
    new RegExp(`--${token}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
  )?.[1];

  if (!value) {
    throw new Error(
      `Missing ${token} contrast token for ${theme}.`,
    );
  }

  return value;
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5]
    .map((start) => Number.parseInt(
      hex.slice(start, start + 2),
      16,
    ) / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);

  return channels[0] * 0.2126
    + channels[1] * 0.7152
    + channels[2] * 0.0722;
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);

  return (
    Math.max(firstLuminance, secondLuminance) + 0.05
  ) / (
    Math.min(firstLuminance, secondLuminance) + 0.05
  );
}

for (const theme of contrastThemes) {
  const block = lastThemeBlock(theme);

  if (!block) {
    throw new Error(
      `Missing contrast token block for ${theme}.`,
    );
  }

  const pairs = [
    ['text', 'surface-soft'],
    ['muted', 'surface-soft'],
    ['text', 'surface-2'],
    ['on-accent', 'accent-2'],
  ];

  for (const [foreground, background] of pairs) {
    const ratio = contrastRatio(
      themeColor(block, foreground, theme),
      themeColor(block, background, theme),
    );

    if (ratio < 4.5) {
      throw new Error(
        `${theme} ${foreground}/${background} contrast is ${ratio.toFixed(2)}:1; expected at least 4.5:1.`,
      );
    }
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
  'Premium theme foundation, preset compatibility, and shared contrast checks passed.',
);
