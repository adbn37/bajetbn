import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2];

if (!['staging', 'production'].includes(mode)) {
  throw new Error(
    'Pages deployment mode must be staging or production.',
  );
}

const policy = JSON.parse(
  fs.readFileSync(
    'config/deployment-environments.json',
    'utf8',
  ),
);

const deployment =
  policy?.cloudflarePages?.[mode];

if (
  !deployment?.project
  || !deployment?.branch
) {
  throw new Error(
    `Cloudflare Pages policy is missing for ${mode}.`,
  );
}

const distPath =
  path.resolve('dist');

if (!fs.existsSync(distPath)) {
  throw new Error(
    'dist does not exist. Build the application before deployment.',
  );
}

const releasePath =
  path.join(distPath, 'release.json');

if (!fs.existsSync(releasePath)) {
  throw new Error(
    'dist/release.json is missing. Refusing to deploy an unverified build.',
  );
}

function git(...args) {
  const result = spawnSync(
    'git',
    args,
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Git command failed: git ${args.join(' ')}`,
    );
  }

  return result.stdout.trim();
}

const branch =
  git('branch', '--show-current');

const commit =
  git('rev-parse', 'HEAD');

const dirty =
  git('status', '--porcelain');

if (dirty) {
  throw new Error(
    'Working tree must be clean before Pages deployment.',
  );
}

if (
  mode === 'production'
  && branch !== 'main'
) {
  throw new Error(
    'Production Pages deployment is allowed only from main.',
  );
}

if (mode === 'production') {
  const originMain =
    git('rev-parse', 'origin/main');

  if (commit !== originMain) {
    throw new Error(
      'Production HEAD must match origin/main before deployment.',
    );
  }
}

const release = JSON.parse(
  fs.readFileSync(
    releasePath,
    'utf8',
  ),
);

console.log(
  'BajetBN Pages deployment:',
  mode,
);
console.log(
  'Cloudflare project:',
  deployment.project,
);
console.log(
  'Cloudflare branch:',
  deployment.branch,
);
console.log(
  'Git commit:',
  commit,
);
console.log(
  'Release:',
  release.label || release.version,
);
console.log(
  'Pages working directory:',
  distPath,
);

const npmCli =
  process.env.npm_execpath;

if (!npmCli) {
  throw new Error(
    'npm_execpath is unavailable. Run this deployment through the npm script.',
  );
}

const result = spawnSync(
  process.execPath,
  [
    npmCli,
    'exec',
    '--yes',
    '--package',
    'wrangler@4.107.0',
    '--',
    'wrangler',
    'pages',
    'deploy',
    '.',
    '--project-name',
    deployment.project,
    '--branch',
    deployment.branch,
    '--commit-hash',
    commit,
  ],
  {
    cwd: distPath,
    stdio: 'inherit',
  },
);

if (result.error) {
  throw new Error(
    `Failed to launch Cloudflare Pages deployment: ${result.error.message}`,
  );
}

if (result.status !== 0) {
  throw new Error(
    `Cloudflare Pages deployment failed with exit code ${result.status}.`,
  );
}
