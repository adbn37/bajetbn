import fs from 'node:fs';

const hub =
  fs.readFileSync(
    'src/features/spaces/SpaceActionHub.tsx',
    'utf8',
  );

const css =
  fs.readFileSync(
    'src/styles/global.css',
    'utf8',
  );

const checks = [
  [
    hub,
    'function shortcutIcon(',
    'semantic shortcut icon helper',
  ],
  [
    hub,
    'className="space-shortcut-icon"',
    'shortcut icon renderer',
  ],
  [
    hub,
    'className="space-shortcut-copy"',
    'shortcut label wrapper',
  ],
  [
    hub,
    'data-simplified-space-navigation',
    'existing simplified navigation preserved',
  ],
  [
    css,
    'BAJETBN V115 SPACE LAUNCHER TILE REDESIGN',
    'launcher tile CSS marker',
  ],
  [
    css,
    'repeat(2, minmax(0, 1fr))',
    'mobile two-column launcher',
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
  'Space launcher tile verifier: PASS',
);
