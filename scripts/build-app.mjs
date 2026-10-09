import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] || 'production';
const skipTypecheck =
  process.argv.includes(
    '--skip-typecheck',
  );

if (!['production', 'staging'].includes(mode)) {
  throw new Error(
    'Build mode must be production or staging.',
  );
}

if (
  skipTypecheck
  && mode !== 'staging'
) {
  throw new Error(
    'TypeScript skipping is allowed only for the staging CI build.',
  );
}

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const optionalKeys = [
  'VITE_FIREBASE_FUNCTIONS_REGION',
  'VITE_FIREBASE_VAPID_KEY',
];

function parseEnvironment(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');

    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      value.length >= 2
      && (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      )
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function readEnvironmentFile(file) {
  if (!fs.existsSync(file)) return {};

  return parseEnvironment(
    fs.readFileSync(file, 'utf8'),
  );
}

const policyPath =
  'config/deployment-environments.json';

if (!fs.existsSync(policyPath)) {
  throw new Error(
    'Deployment environment policy is missing: '
    + policyPath,
  );
}

const policy = JSON.parse(
  fs.readFileSync(policyPath, 'utf8'),
);

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

if (!stagingProject || !productionProject) {
  throw new Error(
    'Deployment policy must define staging and production Firebase projects.',
  );
}

const projectsAreShared =
  stagingProject === productionProject;

if (
  projectsAreShared
  !== (policy.allowSharedFirebaseProject === true)
) {
  throw new Error(
    'Deployment policy shared-project setting does not match '
    + 'the configured Firebase project IDs.',
  );
}

const expectedProject =
  mode === 'production'
    ? productionProject
    : stagingProject;

const modeFile =
  mode === 'production'
    ? '.env.production'
    : '.env.staging';

const modeFileExists =
  fs.existsSync(modeFile);

const fileValues =
  readEnvironmentFile(modeFile);

const processValues = {};

for (
  const key
  of [...requiredKeys, ...optionalKeys]
) {
  const value = process.env[key];

  if (
    typeof value === 'string'
    && value.trim()
  ) {
    processValues[key] =
      value.trim();
  }
}

if (!modeFileExists) {
  const missingProcessKeys =
    requiredKeys.filter(
      (key) =>
        !String(
          processValues[key]
          ?? '',
        ).trim(),
    );

  if (missingProcessKeys.length > 0) {
    throw new Error(
      `${mode} Firebase configuration is missing. `
      + `Provide ${modeFile} or all required environment variables. `
      + 'Cross-environment fallback is disabled. Missing: '
      + missingProcessKeys.join(', '),
    );
  }
}

const buildValues = {
  ...fileValues,
  ...processValues,
  VITE_APP_ENV: mode,
  VITE_FIREBASE_FUNCTIONS_REGION:
    processValues.VITE_FIREBASE_FUNCTIONS_REGION
    || fileValues.VITE_FIREBASE_FUNCTIONS_REGION
    || 'asia-southeast1',
};

const missing = requiredKeys.filter(
  (key) =>
    !String(
      buildValues[key]
      ?? '',
    ).trim(),
);

if (missing.length) {
  throw new Error(
    'Build Firebase configuration is incomplete: '
    + missing.join(', '),
  );
}

if (
  String(buildValues.VITE_FIREBASE_PROJECT_ID)
  !== expectedProject
) {
  throw new Error(
    `${mode} Firebase project does not match deployment policy. `
    + `Expected ${expectedProject}, received `
    + String(
      buildValues.VITE_FIREBASE_PROJECT_ID,
    )
    + '.',
  );
}

const childEnv = {
  ...process.env,
};

for (
  const key
  of [
    ...requiredKeys,
    ...optionalKeys,
    'VITE_APP_ENV',
  ]
) {
  delete childEnv[key];
}

for (
  const [key, value]
  of Object.entries(buildValues)
) {
  if (
    key.startsWith('VITE_')
    && value != null
  ) {
    childEnv[key] =
      String(value);
  }
}

const configurationSource =
  modeFileExists
    ? (
      Object.keys(processValues).length
        ? `${modeFile} + environment overrides`
        : modeFile
    )
    : 'environment variables';

console.log(
  'BajetBN build environment:',
  mode,
);
console.log(
  'Configuration source:',
  configurationSource,
);
console.log(
  'Firebase project:',
  buildValues.VITE_FIREBASE_PROJECT_ID,
);
console.log(
  'Firebase project policy:',
  projectsAreShared
    ? 'shared backend explicitly allowed'
    : 'dedicated backend',
);
console.log(
  'Functions region:',
  buildValues.VITE_FIREBASE_FUNCTIONS_REGION,
);
console.log(
  'Environment badge:',
  buildValues.VITE_APP_ENV,
);

function runNodeScript(
  scriptPath,
  args,
) {
  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      ...args,
    ],
    {
      cwd: process.cwd(),
      env: childEnv,
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    throw new Error(
      'Build command failed: '
      + scriptPath,
    );
  }
}

if (!skipTypecheck) {
  runNodeScript(
    path.resolve(
      'node_modules/typescript/bin/tsc',
    ),
    ['-b'],
  );
} else {
  console.log(
    'TypeScript compile: already validated by staging CI.',
  );
}

runNodeScript(
  path.resolve(
    'node_modules/vite/bin/vite.js',
  ),
  [
    'build',
    '--mode',
    mode,
  ],
);
