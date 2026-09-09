import fs from 'node:fs';

const read =
  (path) =>
    fs.readFileSync(path, 'utf8');

const pkg =
  JSON.parse(read('package.json'));

const lock =
  JSON.parse(read('package-lock.json'));

const release =
  JSON.parse(read('release.json'));

const dashboard =
  read('src/pages/DashboardPage.tsx');

const deploy =
  read('scripts/deploy-production.ps1');

const stagingWorkflow =
  read('.github/workflows/staging-ci.yml');

const wrangler =
  read('wrangler.toml');

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log('PASS:', label);
  } else {
    failures.push(label);
    console.error('FAIL:', label);
  }
}

check(
  pkg.version === '1.14.6',
  'package.json identifies v1.14.6.',
);

check(
  lock.version === '1.14.6'
    && lock.packages?.['']?.version === '1.14.6',
  'package-lock.json identifies v1.14.6.',
);

check(
  release.version === '1.14.6',
  'release.json identifies v1.14.6.',
);

check(
  release.label === 'BajetBN v1.14.6',
  'Release label identifies BajetBN v1.14.6.',
);

check(
  release.channel === 'stable',
  'Release channel is stable.',
);

check(
  /^\d{4}-\d{2}-\d{2}$/.test(
    String(release.releasedAt || ''),
  ),
  'Release date is recorded.',
);

check(
  dashboard.includes(
    'await listAccounts(user.uid);',
  ),
  'Home loads owned Personal and Business accounts.',
);

check(
  !dashboard.includes(
    'listPersonalAccounts',
  ),
  'Home is not restricted to Personal accounts.',
);

check(
  pkg.scripts[
    'verify:home-business-accounts-v1146'
  ] ===
    'node scripts/verify-home-business-accounts-v1146.mjs',
  'Home Business-account verifier is registered.',
);

check(
  pkg.scripts[
    'verify:deployment-hardening-v1146'
  ] ===
    'node scripts/verify-deployment-hardening-v1146.mjs',
  'Deployment-hardening verifier is registered.',
);

check(
  deploy.includes(
    '$ProductionProject = "bajetbn"',
  ),
  'Production Cloudflare target is fixed to bajetbn.',
);

check(
  deploy.includes(
    '$StagingProject    = "bajetbn-staging"',
  ),
  'Staging Cloudflare target remains separate.',
);

check(
  deploy.includes('origin/staging')
    && deploy.includes('origin/main')
    && deploy.includes('ExpectedSha'),
  'Production deployment verifies Git lineage.',
);

check(
  deploy.includes('GetTempPath()')
    && deploy.includes(
      'Push-Location $DeployWorkingDirectory',
    ),
  'Production Wrangler runs outside the repository.',
);

check(
  deploy.includes(
    '--commit-hash $ExpectedSha',
  ),
  'Cloudflare deployment records approved release SHA.',
);

check(
  deploy.includes(
    '[switch]$DryRun',
  ),
  'Production deployment supports dry run.',
);

check(
  stagingWorkflow.includes(
    'cd "$RUNNER_TEMP"',
  ),
  'Staging Wrangler runs outside repository.',
);

check(
  stagingWorkflow.includes(
    '"$GITHUB_WORKSPACE/dist"',
  ),
  'Staging deploys only built dist artifact.',
);

check(
  stagingWorkflow.includes(
    '--project-name bajetbn-staging',
  ),
  'Staging targets only bajetbn-staging.',
);

check(
  wrangler.includes(
    'name = "bajetbn-staging"',
  )
    && wrangler.includes(
      'pages_build_output_dir = "dist"',
    ),
  'Repository Wrangler config remains staging-only.',
);

const structural =
  pkg.scripts['verify:all-structural'] || '';

check(
  structural.includes(
    'npm run verify:home-business-accounts-v1146',
  ),
  'Home Business verifier is permanent.',
);

check(
  structural.includes(
    'npm run verify:deployment-hardening-v1146',
  ),
  'Deployment-hardening verifier is permanent.',
);

check(
  structural.includes(
    'npm run verify:v1146-release-gate',
  ),
  'v1.14.6 final release gate is permanent.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  throw new Error(
    `v1.14.6 release gate failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  '============================================================',
);
console.log(
  ' BAJETBN v1.14.6 FINAL RELEASE GATE: PASS',
);
console.log(
  '============================================================',
);