import fs from 'node:fs';

const productionPath = '.env.production';
const policyPath = 'config/deployment-environments.json';

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
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

function missingKeys(values) {
  return requiredKeys.filter(
    (key) => !String(values[key] ?? '').trim(),
  );
}

if (!fs.existsSync(policyPath)) {
  throw new Error(
    'Deployment environment policy is missing: '
    + policyPath,
  );
}

const policy = JSON.parse(
  fs.readFileSync(policyPath, 'utf8'),
);

const expectedProductionProject =
  String(
    policy?.firebaseProjects?.production
    || '',
  ).trim();

if (!expectedProductionProject) {
  throw new Error(
    'Deployment policy does not define a production Firebase project.',
  );
}

const processValues = Object.fromEntries(
  requiredKeys.map(
    (key) => [key, process.env[key]],
  ),
);

if (!fs.existsSync(productionPath)) {
  const missing = missingKeys(processValues);

  if (missing.length > 0) {
    throw new Error(
      'Production Firebase configuration is missing. '
      + 'Provide .env.production or all required production '
      + 'environment variables. Production builds never fall '
      + 'back to .env.staging. Missing: '
      + missing.join(', '),
    );
  }

  if (
    String(processValues.VITE_FIREBASE_PROJECT_ID || '').trim()
    !== expectedProductionProject
  ) {
    throw new Error(
      'Production Firebase project does not match deployment policy. '
      + 'Expected '
      + expectedProductionProject
      + '.',
    );
  }

  console.log(
    'Production Firebase configuration supplied explicitly '
    + 'by environment variables.',
  );
  console.log(
    'Production Firebase project verified:',
    expectedProductionProject,
  );

  process.exit(0);
}

let productionContent = fs.readFileSync(
  productionPath,
  'utf8',
);

if (/^\s*VITE_APP_ENV\s*=/m.test(productionContent)) {
  productionContent = productionContent.replace(
    /^\s*VITE_APP_ENV\s*=.*$/m,
    'VITE_APP_ENV=production',
  );
} else {
  productionContent =
    `${productionContent.trimEnd()}\nVITE_APP_ENV=production\n`;
}

fs.writeFileSync(
  productionPath,
  productionContent,
  'utf8',
);

const productionValues = {
  ...parseEnvironment(productionContent),
  ...Object.fromEntries(
    Object.entries(processValues).filter(
      ([, value]) => String(value ?? '').trim(),
    ),
  ),
};

const missing = missingKeys(productionValues);

if (missing.length > 0) {
  throw new Error(
    `Production Firebase configuration is incomplete: ${missing.join(', ')}`,
  );
}

if (
  String(productionValues.VITE_FIREBASE_PROJECT_ID || '').trim()
  !== expectedProductionProject
) {
  throw new Error(
    'Production Firebase project does not match deployment policy. '
    + 'Expected '
    + expectedProductionProject
    + '.',
  );
}

console.log(
  'Production Firebase configuration verified.',
);
console.log(
  'Production Firebase project verified:',
  expectedProductionProject,
);
