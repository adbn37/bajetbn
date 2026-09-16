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

const join =
  read(
    'src/features/collaboration/JoinSpacePage.tsx',
  );

const routeGuards =
  read(
    'src/app/RouteGuards.tsx',
  );

const failures = [];

function check(
  condition,
  label,
) {
  if (condition) {
    console.log(
      'PASS: ' + label,
    );

    return;
  }

  console.error(
    'FAIL: ' + label,
  );

  failures.push(
    label,
  );
}

const versionParts =
  (value) =>
    String(value || '')
      .split('.')
      .map((part) => Number(part));

const atLeast11412 =
  (value) => {
    const [major, minor, patch] =
      versionParts(value);

    return (
      major > 1
      || (
        major === 1
        && (
          minor > 14
          || (
            minor === 14
            && patch >= 12
          )
        )
      )
    );
  };

check(
  atLeast11412(pkg.version),
  'package.json is v1.14.12 or newer.',
);

check(
  lock.version === pkg.version
    && lock.packages?.['']?.version === pkg.version,
  'package-lock.json matches package.json.',
);

check(
  release.version === pkg.version,
  'release.json matches package.json.',
);

check(
  release.label === `BajetBN v${release.version}`,
  'Release label matches release version.',
);

check(
  release.channel === 'stable',
  'Release channel is stable.',
);

check(
  /^\d{4}-\d{2}-\d{2}$/.test(
    String(release.releasedAt || ''),
  ),
  'Release date is a valid ISO date.',
);

check(
  fs.existsSync(
    'scripts/verify-share-settlement-join-v11412.mjs',
  ),
  'v1.14.12 feature verifier exists.',
);

check(
  fs.existsSync(
    'scripts/verify-space-centred-workflow.mjs',
  ),
  'Updated Space workflow verifier exists.',
);

const releaseGateCommand =
  pkg.scripts[
    'verify:v11412-release-gate'
  ] || '';

check(
  releaseGateCommand.includes(
    'verify-marketplace-pos-v1148.mjs',
  )
    && releaseGateCommand.includes(
      'verify-marketplace-ia-v1149.mjs',
    )
    && releaseGateCommand.includes(
      'verify-marketplace-mobile-v11410.mjs',
    )
    && releaseGateCommand.includes(
      'verify-marketplace-inline-v11411.mjs',
    )
    && releaseGateCommand.includes(
      'verify:v11412-share-settlement-join',
    ),
  'v1.14.12 release gate retains all prior marketplace regression gates.',
);

check(
  (
    pkg.scripts[
      'verify:all-structural'
    ] || ''
  ).includes(
    'npm run verify:v11412-release-gate',
  ),
  'v1.14.12 is the active final structural release gate.',
);

check(
  !(
    pkg.scripts[
      'verify:all-structural'
    ] || ''
  ).includes(
    'npm run verify:v11411-release-gate',
  ),
  'v1.14.11 is no longer the direct final release gate.',
);

check(
  join.includes(
    'safeJoinTarget',
  )
    && join.includes(
      'result.spaceId',
    ),
  'Safe post-invite Space destination remains active.',
);

check(
  routeGuards.includes(
    'const returnPath',
  )
    && routeGuards.includes(
      'to="/verify-email"',
    )
    && routeGuards.includes(
      'to="/onboarding"',
    ),
  'Protected invitation return path remains active.',
);

check(
  /\$ProductionProject\s*=\s*"bajetbn"/.test(
    deploy,
  ),
  'Production Cloudflare project remains fixed.',
);

check(
  /\$StagingProject\s*=\s*"bajetbn-staging"/.test(
    deploy,
  ),
  'Production and staging Cloudflare projects remain separated.',
);

check(
  deploy.includes(
    'origin/main',
  )
    && deploy.includes(
      'origin/staging',
    )
    && deploy.includes(
      'ExpectedSha',
    ),
  'Production deployment retains exact SHA lineage guards.',
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

  for (
    const failure
    of failures
  ) {
    console.error(
      '- ' + failure,
    );
  }

  throw new Error(
    'v1.14.12 release gate failed: '
      + failures.length
      + ' check(s).',
  );
}

console.log('');
console.log(
  '============================================================',
);

console.log(
  ' BAJETBN v1.14.12 FINAL RELEASE GATE: PASS',
);

console.log(
  '============================================================',
);
