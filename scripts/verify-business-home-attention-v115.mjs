import fs from 'node:fs';

const page =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const attention =
  fs.readFileSync(
    'src/features/spaces/SmeOperationalAttentionPanel.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [
    page,
    'SmeOperationalAttentionPanel',
    'Business Home reuses operational attention',
  ],
  [
    page,
    'data-business-home-attention',
    'Business Home attention marker',
  ],
  [
    page,
    "isOwner\n                ? 'owner'\n                : posRole",
    'Owner role is passed explicitly',
  ],
  [
    page,
    'canViewFinancials && (',
    'Attention remains behind financial-role gate',
  ],
  [
    attention,
    "role === 'owner' || role === 'manager'",
    'Attention engine itself remains Owner/Manager only',
  ],
  [
    attention,
    /const\s+salesFocused\s*=\s*[\s\S]{0,120}?industry\s*===\s*'retail'[\s\S]{0,80}?industry\s*===\s*'marketplace'/m,
    'Attention remains sales-industry scoped',
  ],
  [
    css,
    'BAJETBN V115 BUSINESS HOME OPERATIONAL ATTENTION',
    'Business Home attention styles',
  ],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok =
    marker instanceof RegExp
      ? marker.test(text)
      : text.includes(marker);

  console.log(
    (ok ? 'PASS ' : 'FAIL ')
    + label,
  );

  if (!ok) failed += 1;
}

if (failed) {
  process.exit(1);
}

console.log(
  'Business Home operational attention verifier: PASS',
);
