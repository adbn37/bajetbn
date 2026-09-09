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

/*
 * Existing staging isolation
 */

check(
  wrangler.includes(
    'name = "bajetbn-staging"',
  ),
  'Repository Wrangler configuration remains staging-only.',
);

check(
  wrangler.includes(
    'pages_build_output_dir = "dist"',
  ),
  'Staging Wrangler configuration points only to dist.',
);

check(
  wrangler.includes(
    'intentionally staging-only',
  ),
  'Staging-only intent is documented.',
);

check(
  stagingWorkflow.includes(
    'cd "$RUNNER_TEMP"',
  ),
  'Staging Wrangler executes outside the repository.',
);

check(
  stagingWorkflow.includes(
    '"$GITHUB_WORKSPACE/dist"',
  ),
  'Staging deploy uses the absolute verified dist artifact.',
);

check(
  stagingWorkflow.includes(
    '--project-name bajetbn-staging',
  ),
  'Staging deploy targets only bajetbn-staging.',
);

check(
  stagingWorkflow.includes(
    '--branch staging',
  ),
  'Staging deploy explicitly identifies the staging branch.',
);

/*
 * Production target protection
 */

check(
  deploy.includes(
    '$ProductionProject = "bajetbn"',
  )
    && deploy.includes(
      '$StagingProject    = "bajetbn-staging"',
    ),
  'Production and staging Cloudflare project names are explicit.',
);

check(
  deploy.includes(
    '$ProductionBranch = "main"',
  ),
  'Production branch is fixed to main.',
);

check(
  deploy.includes(
    'Production deployment can run only from main',
  ),
  'Production deployment refuses non-main branches.',
);

/*
 * Release lineage
 */

for (const token of [
  'origin/main',
  'origin/staging',
  'ExpectedSha',
  'ExpectedVersion',
  'refs/tags/',
  'package.json',
  'release.json',
]) {
  check(
    deploy.includes(token),
    `Production release guard includes ${token}.`,
  );
}

check(
  deploy.includes(
    'Production release must exactly match the staging-approved SHA.',
  ),
  'Production SHA must exactly match staging.',
);

check(
  deploy.includes(
    'does not point to the approved release SHA',
  ),
  'Release tag must point to the approved SHA.',
);

/*
 * Validation before mutation
 */

for (const token of [
  'verify:all-structural',
  '--omit=dev',
  '--audit-level=high',
  '--mode',
  'production',
  'verify-build-output.mjs',
  'diff',
  '--check',
]) {
  check(
    deploy.includes(token),
    `Production deploy validates ${token}.`,
  );
}

check(
  deploy.includes(
    '[switch]$DryRun',
  )
    && deploy.includes(
      'Cloudflare was NOT changed.',
    ),
  'Production deploy supports a no-mutation dry run.',
);

/*
 * Wrangler repository isolation
 */

check(
  deploy.includes(
    'GetTempPath()',
  )
    && deploy.includes(
      'Push-Location $DeployWorkingDirectory',
    ),
  'Production Wrangler runs from an isolated temporary directory.',
);

check(
  deploy.includes(
    'pages deploy',
  )
    && deploy.includes(
      '--project-name $ProductionProject',
    )
    && deploy.includes(
      '--branch $ProductionBranch',
    ),
  'Production Pages target is passed explicitly.',
);

check(
  deploy.includes(
    '--commit-hash $ExpectedSha',
  )
    && deploy.includes(
      '--commit-message "BajetBN v$ExpectedVersion"',
    )
    && deploy.includes(
      '--commit-dirty=false',
    ),
  'Production deployment receives explicit release identity metadata.',
);

check(
  !deploy.includes(
    'firebase deploy',
  ),
  'Cloudflare production script does not deploy Firebase resources.',
);

check(
  !deploy.includes(
    'wrangler.toml',
  ),
  'Production deploy does not consume the staging-only Wrangler config.',
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
  'Production Cloudflare command never targets Firebase Functions.',
);

/*
 * Structural-suite registration
 */

check(
  packageJson.scripts[
    'verify:deployment-hardening-v1146'
  ]
    ===
    'node scripts/verify-deployment-hardening-v1146.mjs',
  'Deployment-hardening verifier has a dedicated npm command.',
);

check(
  packageJson.scripts[
    'verify:all-structural'
  ].includes(
    'npm run verify:deployment-hardening-v1146',
  ),
  'Deployment-hardening verifier is part of the full structural suite.',
);

if (failures.length) {
  throw new Error(
    `Deployment hardening verification failed: ${failures.length} check(s).`,
  );
}

console.log(
  'BajetBN v1.14.6 deployment hardening verification PASS.',
);