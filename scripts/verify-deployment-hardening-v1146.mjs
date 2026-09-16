import fs from 'node:fs';

const packageJson =
  JSON.parse(
    fs.readFileSync(
      'package.json',
      'utf8',
    ),
  );

const deploy =
  fs.readFileSync(
    'scripts/deploy-production.ps1',
    'utf8',
  );

const stagingWorkflow =
  fs.readFileSync(
    '.github/workflows/staging-ci.yml',
    'utf8',
  );

const wrangler =
  fs.readFileSync(
    'wrangler.toml',
    'utf8',
  );

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
  } else {
    failures.push(message);
    console.error('FAIL:', message);
  }
}

check(
  wrangler.includes(
    'name = "bajetbn-staging"',
  ),
  'Repository Wrangler configuration remains staging-only.',
);

check(
  stagingWorkflow.includes(
    'npm run build:staging',
  ),
  'Staging uses the explicit staging build.',
);

check(
  stagingWorkflow.includes(
    'verify:built-environment-v11417',
  ),
  'Staging verifies its compiled environment before deployment.',
);

check(
  stagingWorkflow.includes(
    'cd "$RUNNER_TEMP"',
  )
    && stagingWorkflow.includes(
      '"$GITHUB_WORKSPACE/dist"',
    ),
  'Staging Wrangler runs outside the repository and deploys only dist.',
);

for (const token of [
  '$ProductionProject = "bajetbn"',
  '$StagingProject = "bajetbn-staging"',
  '$ProductionBranch = "main"',
  'origin/main',
  'origin/staging',
  'ExpectedSha',
  'ExpectedVersion',
  'verify:all-structural',
  'verify:built-environment-v11417',
  'verify-build-output.mjs',
  '--omit=dev',
  '--audit-level=high',
  '[switch]$DryRun',
  'GetTempPath()',
  'pages deploy',
  '--project-name $ProductionProject',
  '--branch $ProductionBranch',
  '--commit-hash $ExpectedSha',
  '--commit-dirty=false',
  'precache-manifest.json',
]) {
  check(
    deploy.includes(token),
    `Production deployment guard includes ${token}.`,
  );
}

check(
  !deploy.includes(
    'refs/tags/',
  ),
  'Production deployment no longer requires a tag before live smoke testing.',
);

check(
  !deploy.includes(
    'firebase deploy',
  ),
  'Production Cloudflare deployment never deploys Firebase.',
);

const executableDeployLines =
  deploy
    .split(/\r?\n/)
    .filter(
      (line) =>
        !line.trimStart().startsWith('#'),
    )
    .join('\n');

check(
  !executableDeployLines.includes(
    'functions/',
  ),
  'Production Cloudflare command never uploads the repository Firebase Functions directory.',
);

check(
  packageJson.scripts[
    'verify:deployment-hardening-v1146'
  ]
    ===
    'node scripts/verify-deployment-hardening-v1146.mjs',
  'Deployment-hardening verifier remains registered.',
);

check(
  packageJson.scripts[
    'verify:all-structural'
  ].includes(
    'npm run verify:deployment-hardening-v1146',
  ),
  'Deployment-hardening verifier remains part of the full structural suite.',
);

if (failures.length) {
  throw new Error(
    `Deployment hardening verification failed: ${failures.length} check(s).`,
  );
}

console.log(
  'BajetBN deployment hardening verification PASS.',
);
