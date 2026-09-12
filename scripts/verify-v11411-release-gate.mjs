import fs from 'node:fs';

const read =
  (path) =>
    fs.readFileSync(
      path,
      'utf8',
    );

const pkg =
  JSON.parse(
    read('package.json'),
  );

const lock =
  JSON.parse(
    read('package-lock.json'),
  );

const release =
  JSON.parse(
    read('release.json'),
  );

const deploy =
  read(
    'scripts/deploy-production.ps1',
  );

const stagingWorkflow =
  read(
    '.github/workflows/staging-ci.yml',
  );

const shell =
  read(
    'src/layouts/AppShell.tsx',
  );

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log(
      'PASS: ' + label,
    );
    return;
  }

  console.error(
    'FAIL: ' + label,
  );

  failures.push(label);
}

check(
  pkg.version === '1.14.11',
  'package.json identifies v1.14.11.',
);

check(
  lock.version === '1.14.11'
    && lock.packages?.['']?.version === '1.14.11',
  'package-lock.json identifies v1.14.11.',
);

check(
  release.version === '1.14.11',
  'release.json identifies v1.14.11.',
);

check(
  release.label === 'BajetBN v1.14.11',
  'Release label is BajetBN v1.14.11.',
);

check(
  release.channel === 'stable',
  'Release channel is stable.',
);

check(
  release.releasedAt === '2026-09-12',
  'Release date is 2026-09-12.',
);

const requiredVerifiers = [
  'scripts/verify-bills-space-share-v1147.mjs',
  'scripts/verify-global-bills-household-v1147.mjs',
  'scripts/verify-smart-share-links-v1147.mjs',
  'scripts/verify-home-money-activity-share-v1147.mjs',
  'scripts/verify-transaction-public-share-v1147.mjs',
  'scripts/verify-transaction-auth-deeplink-v1147.mjs',
  'scripts/verify-space-home-overview-v1147.mjs',
  'scripts/verify-desktop-full-navigation-v1147.mjs',
  'scripts/verify-marketplace-pos-v1148.mjs',
  'scripts/verify-marketplace-ia-v1149.mjs',
  'scripts/verify-marketplace-mobile-v11410.mjs',
  'scripts/verify-marketplace-inline-v11411.mjs',
];

for (const verifier of requiredVerifiers) {
  check(
    fs.existsSync(verifier),
    verifier + ' exists.',
  );
}

check(
  pkg.scripts[
    'verify:desktop-full-navigation-v1147'
  ] ===
    'node scripts/verify-desktop-full-navigation-v1147.mjs',
  'Desktop navigation verifier remains registered.',
);

check(
  (
    pkg.scripts[
      'verify:all-structural'
    ] || ''
  ).includes(
    'npm run verify:v11411-release-gate',
  ),
  'v1.14.11 gate is wired into structural verification.',
);

check(
  !(
    pkg.scripts[
      'verify:all-structural'
    ] || ''
  ).includes(
    'npm run verify:v1147-release-gate',
  ),
  'Old v1.14.7 final gate is no longer the active release gate.',
);

const mobileStart =
  shell.indexOf(
    '<nav className="mobile-bottom-nav"',
  );

const desktopShell =
  mobileStart >= 0
    ? shell.slice(
        0,
        mobileStart,
      )
    : shell;

const mobileShell =
  mobileStart >= 0
    ? shell.slice(
        mobileStart,
      )
    : '';

check(
  !desktopShell.includes(
    '<NavLink to="/more"',
  )
    && !desktopShell.includes(
      'More tools',
    ),
  'Desktop global More remains removed.',
);

check(
  mobileShell.includes(
    'to="/more"',
  )
    && mobileShell.includes(
      '<small>More</small>',
    ),
  'Mobile More remains available.',
);

check(
  deploy.includes(
    '$ProductionProject = "bajetbn"',
  ),
  'Production Cloudflare project remains fixed.',
);

check(
  deploy.includes(
    '$StagingProject    = "bajetbn-staging"',
  ),
  'Staging and production Cloudflare projects remain separated.',
);

check(
  deploy.includes(
    'origin/staging',
  )
    && deploy.includes(
      'origin/main',
    )
    && deploy.includes(
      'ExpectedSha',
    ),
  'Production deployment retains exact Git lineage guards.',
);

check(
  deploy.includes(
    '[switch]$DryRun',
  ),
  'Production deployment retains DryRun.',
);

check(
  stagingWorkflow.includes(
    '--project-name bajetbn-staging',
  ),
  'GitHub staging workflow remains staging-only.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error(
      '- ' + failure,
    );
  }

  throw new Error(
    'v1.14.11 release gate failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  '============================================================',
);

console.log(
  ' BAJETBN v1.14.11 FINAL RELEASE GATE: PASS',
);

console.log(
  '============================================================',
);
