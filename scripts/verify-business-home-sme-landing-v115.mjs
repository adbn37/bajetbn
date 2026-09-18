import fs from 'node:fs';

const space =
  fs.readFileSync(
    'src/features/spaces/SpaceDetailsPage.tsx',
    'utf8',
  );

const businessHome =
  fs.readFileSync(
    'src/features/business/BusinessHomePage.tsx',
    'utf8',
  );

const checks = [
  [
    space,
    'Navigate,',
    'Space Details imports Navigate',
  ],
  [
    space,
    "space.type === 'sme'",
    'SME landing condition exists',
  ],
  [
    space,
    '&& !requestedTab',
    'SME tabs remain routable',
  ],
  [
    space,
    '&& !requestedSection',
    'SME sections remain routable',
  ],
  [
    space,
    '&& !detailedOverviewRequested',
    'SME detailed tools remain routable',
  ],
  [
    space,
    "to={'/business/' + space.id}",
    'Plain SME landing redirects to Business Home',
  ],
  [
    businessHome,
    "+ '?details=1'",
    'Business Home Tools button avoids redirect loop',
  ],
  [
    businessHome,
    '>\n          Tools\n        </Link>',
    'Business Home header labels legacy area as Tools',
  ],
];

let failed = 0;

for (const [text, marker, label] of checks) {
  const ok = text.includes(marker);

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
  'Business Home SME landing verifier: PASS',
);
