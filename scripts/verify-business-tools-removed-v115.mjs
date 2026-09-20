import fs from 'node:fs';

const home = fs.readFileSync(
  'src/features/business/BusinessHomePage.tsx',
  'utf8',
);

const checks = [
  [
    !home.includes(
      "?details=1",
    ),
    'Generic Space details shortcut removed from Business Home',
  ],
  [
    !home.includes(
      '>\n          Tools\n        </Link>',
    ),
    'Tools button removed from Business Home header',
  ],
  [
    home.includes(
      'Business Setup',
    ),
    'Business Setup remains available',
  ],
  [
    home.includes(
      'data-business-workspace-nav',
    ),
    'Business workspace navigation remains intact',
  ],
];

let failed = 0;

for (const [ok, label] of checks) {
  console.log(
    (ok ? 'PASS ' : 'FAIL ')
    + label,
  );

  if (!ok) failed += 1;
}

if (failed) process.exit(1);

console.log(
  'Business Tools removal verifier: PASS',
);
