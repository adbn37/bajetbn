import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json', 'firebase.json', 'firestore.rules', 'storage.rules',
  'src/app/App.tsx', 'src/layouts/AppShell.tsx',
  'src/features/onboarding/OnboardingPage.tsx',
  'src/features/spaces/SpacesPage.tsx', 'src/features/accounts/AccountsPage.tsx',
  'functions/src/index.ts', 'public/_redirects', 'STAGING_TEST_CHECKLIST.md'
];

const missing = required.filter((item) => !fs.existsSync(path.join(root, item)));
if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}

for (const item of ['package.json', 'firebase.json', 'firestore.indexes.json', 'functions/package.json', '.firebaserc']) {
  JSON.parse(fs.readFileSync(path.join(root, item), 'utf8'));
}

const forbiddenFiles = ['.env', '.env.local', '.env.staging', '.env.production'];
let trackedForbidden = [];
try {
  const tracked = execFileSync('git', ['ls-files', '--', ...forbiddenFiles], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  trackedForbidden = tracked;
} catch {
  // A source package has no Git index, so environment files must not be present in it at all.
  trackedForbidden = forbiddenFiles.filter((item) => fs.existsSync(path.join(root, item)));
}
if (trackedForbidden.length) {
  console.error('Potential secret-bearing environment files must not be tracked or packaged:', trackedForbidden.join(', '));
  process.exit(1);
}

const firebaseAliases = JSON.parse(fs.readFileSync(path.join(root, '.firebaserc'), 'utf8'));
if (firebaseAliases?.projects?.staging !== 'bajetbn-staging') {
  console.error('The Firebase staging alias is missing or points to the wrong project.');
  process.exit(1);
}

console.log(`BajetBN structure verified (${required.length} required files, environment-file tracking, and staging alias checked).`);
