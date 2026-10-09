import fs from 'node:fs';

const fail = (message) => {
  throw new Error(message);
};

const packageJson = JSON.parse(
  fs.readFileSync(
    'package.json',
    'utf8',
  ),
);

const policy = JSON.parse(
  fs.readFileSync(
    'config/deployment-environments.json',
    'utf8',
  ),
);

const source = fs.readFileSync(
  'scripts/deploy-pages.mjs',
  'utf8',
);

if (
  packageJson.scripts['deploy:pages:staging']
  !== 'npm run build:staging && node scripts/deploy-pages.mjs staging'
) {
  fail(
    'Safe staging Pages deployment script is missing.',
  );
}

if (
  packageJson.scripts['deploy:pages:production']
  !== 'npm run build && node scripts/deploy-pages.mjs production'
) {
  fail(
    'Safe production Pages deployment script is missing.',
  );
}

if (
  !packageJson.scripts[
    'verify:all-structural'
  ].includes(
    'node scripts/verify-pages-deployment-safety.mjs',
  )
) {
  fail(
    'Pages deployment verifier is missing from structural verification.',
  );
}

for (const expected of [
  "'--cwd'",
  'distPath',
  "'wrangler@4.107.0'",
  "'pages'",
  "'deploy'",
  "'origin/main'",
  "branch !== 'main'",
  "'status', '--porcelain'",
]) {
  if (!source.includes(expected)) {
    fail(
      `Pages deployment safety is missing: ${expected}`,
    );
  }
}

if (
  policy?.cloudflarePages?.staging?.project
  !== 'bajetbn-staging'
) {
  fail(
    'Staging Cloudflare Pages project is incorrect.',
  );
}

if (
  policy?.cloudflarePages?.staging?.branch
  !== 'staging'
) {
  fail(
    'Staging Cloudflare Pages branch is incorrect.',
  );
}

if (
  policy?.cloudflarePages?.production?.project
  !== 'bajetbn'
) {
  fail(
    'Production Cloudflare Pages project is incorrect.',
  );
}

if (
  policy?.cloudflarePages?.production?.branch
  !== 'main'
) {
  fail(
    'Production Cloudflare Pages branch is incorrect.',
  );
}

console.log(
  'Cloudflare Pages deployment safety verification passed.',
);
