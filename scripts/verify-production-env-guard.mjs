import fs from 'node:fs';

const fail = (message) => {
  throw new Error(message);
};

const packageJson = JSON.parse(
  fs.readFileSync('package.json', 'utf8'),
);

const source = fs.readFileSync(
  'scripts/prepare-production-env.mjs',
  'utf8',
);

if (
  packageJson.scripts.prebuild
  !== 'node scripts/prepare-production-env.mjs'
) {
  fail('Production environment preparation is not attached to prebuild.');
}

if (
  !packageJson.scripts['verify:all-structural'].includes(
    'node scripts/verify-production-env-guard.mjs',
  )
) {
  fail('Production environment guard is missing from structural verification.');
}

for (const expected of [
  '.env.production',
  '.env.staging',
  'VITE_APP_ENV=production',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'process.env',
]) {
  if (!source.includes(expected)) {
    fail(`Production environment guard is missing: ${expected}`);
  }
}

console.log(
  'Production environment guard verification passed.',
);