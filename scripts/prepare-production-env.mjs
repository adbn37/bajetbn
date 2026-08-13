import fs from 'node:fs';

const productionPath = '.env.production';
const stagingPath = '.env.staging';

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
    const value = line.slice(separator + 1).trim();

    values[key] = value;
  }

  return values;
}

function missingKeys(values) {
  return requiredKeys.filter(
    (key) => !String(values[key] ?? '').trim(),
  );
}

const processValues = Object.fromEntries(
  requiredKeys.map((key) => [key, process.env[key]]),
);

if (!fs.existsSync(productionPath)) {
  if (missingKeys(processValues).length === 0) {
    console.log(
      'Production Firebase configuration supplied by environment variables.',
    );
    process.exit(0);
  }

  if (!fs.existsSync(stagingPath)) {
    throw new Error(
      'Production Firebase configuration is missing. '
      + 'Provide environment variables, .env.production, '
      + 'or the shared .env.staging configuration.',
    );
  }

  let content = fs.readFileSync(stagingPath, 'utf8');

  if (/^\s*VITE_APP_ENV\s*=/m.test(content)) {
    content = content.replace(
      /^\s*VITE_APP_ENV\s*=.*$/m,
      'VITE_APP_ENV=production',
    );
  } else {
    content = `${content.trimEnd()}\nVITE_APP_ENV=production\n`;
  }

  const stagingValues = parseEnvironment(content);
  const missing = missingKeys(stagingValues);

  if (missing.length > 0) {
    throw new Error(
      `Shared Firebase configuration is incomplete: ${missing.join(', ')}`,
    );
  }

  fs.writeFileSync(productionPath, content, 'utf8');

  console.log(
    'Prepared ignored .env.production from shared staging Firebase configuration.',
  );
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

console.log(
  'Production Firebase configuration verified.',
);