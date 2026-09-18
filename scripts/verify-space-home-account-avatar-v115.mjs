import fs from 'node:fs';

const page =
  fs.readFileSync(
    'src/features/spaces/SpaceDetailsPage.tsx',
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
    "import { AccountAvatar } from '../accounts/AccountAvatar';",
    'shared AccountAvatar import',
  ],
  [
    page,
    '<AccountAvatar',
    'Space Home account avatar',
  ],
  [
    page,
    'className="space-home-v115-account-avatar"',
    'Space Home avatar class',
  ],
  [
    css,
    'BAJETBN V115 SPACE HOME ACCOUNT AVATAR',
    'Space Home avatar CSS marker',
  ],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed += 1;
}

if (failed) {
  process.exit(1);
}

console.log(
  'Space Home account avatar verifier: PASS',
);
