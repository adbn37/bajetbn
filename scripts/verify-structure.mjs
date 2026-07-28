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

for (const item of ['package.json', 'firebase.json', 'firestore.indexes.json', 'functions/package.json']) {
  JSON.parse(fs.readFileSync(path.join(root, item), 'utf8'));
}

const forbiddenFiles = ['.env', '.env.local', '.env.staging', '.env.production', '.firebaserc'];
const presentForbidden = forbiddenFiles.filter((item) => fs.existsSync(path.join(root, item)));
if (presentForbidden.length) {
  console.error('Potential secret-bearing files must not be packaged:', presentForbidden.join(', '));
  process.exit(1);
}

console.log(`BajetBN structure verified (${required.length} required files).`);
