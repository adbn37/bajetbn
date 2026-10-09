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

const preparationSource =
  fs.readFileSync(
    'scripts/prepare-production-env.mjs',
    'utf8',
  );

const buildSource =
  fs.readFileSync(
    'scripts/build-app.mjs',
    'utf8',
  );

const policyPath =
  'config/deployment-environments.json';

if (!fs.existsSync(policyPath)) {
  fail(
    'Deployment environment policy is missing.',
  );
}

const policy = JSON.parse(
  fs.readFileSync(
    policyPath,
    'utf8',
  ),
);

if (
  packageJson.scripts.prebuild
  !== 'node scripts/prepare-production-env.mjs'
) {
  fail(
    'Production environment preparation is not attached to prebuild.',
  );
}

if (
  !packageJson.scripts[
    'verify:all-structural'
  ].includes(
    'node scripts/verify-production-env-guard.mjs',
  )
) {
  fail(
    'Production environment guard is missing from structural verification.',
  );
}

const stagingProject =
  String(
    policy?.firebaseProjects?.staging
    || '',
  ).trim();

const productionProject =
  String(
    policy?.firebaseProjects?.production
    || '',
  ).trim();

if (
  !stagingProject
  || !productionProject
) {
  fail(
    'Deployment policy must define both Firebase projects.',
  );
}

if (
  (stagingProject === productionProject)
  !== (
    policy.allowSharedFirebaseProject
    === true
  )
) {
  fail(
    'Deployment policy shared Firebase project flag is inconsistent.',
  );
}

for (const expected of [
  '.env.production',
  'config/deployment-environments.json',
  'VITE_APP_ENV=production',
  'VITE_FIREBASE_PROJECT_ID',
  'Production builds never fall',
  'expectedProductionProject',
]) {
  if (
    !preparationSource.includes(
      expected,
    )
  ) {
    fail(
      `Production environment preparation is missing: ${expected}`,
    );
  }
}

for (const forbidden of [
  "const stagingPath = '.env.staging'",
  'Prepared ignored .env.production from shared staging Firebase configuration.',
]) {
  if (
    preparationSource.includes(
      forbidden,
    )
  ) {
    fail(
      `Production preparation still contains staging fallback behavior: ${forbidden}`,
    );
  }
}

for (const expected of [
  '.env.production',
  '.env.staging',
  'config/deployment-environments.json',
  'expectedProject',
  'Configuration source:',
  'Cross-environment fallback is disabled.',
  'Firebase project policy:',
]) {
  if (
    !buildSource.includes(
      expected,
    )
  ) {
    fail(
      `Build environment guard is missing: ${expected}`,
    );
  }
}

if (
  buildSource.includes(
    "fileValues = readEnvironmentFile('.env.staging')",
  )
) {
  fail(
    'Production build still contains a direct staging-file fallback.',
  );
}

const gitignore =
  fs.readFileSync(
    '.gitignore',
    'utf8',
  );

for (const ignored of [
  '.env.staging',
  '.env.production',
]) {
  if (!gitignore.includes(ignored)) {
    fail(
      `${ignored} must remain ignored.`,
    );
  }
}

console.log(
  'Production environment guard verification passed.',
);
console.log(
  'Staging Firebase project:',
  stagingProject,
);
console.log(
  'Production Firebase project:',
  productionProject,
);
console.log(
  'Shared Firebase backend:',
  stagingProject === productionProject
    ? 'explicitly allowed'
    : 'no',
);
