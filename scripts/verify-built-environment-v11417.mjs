import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv[2] || 'production';

assert.equal(
  ['production', 'staging'].includes(mode),
  true,
  'Mode must be production or staging.',
);

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

function readEnvironment(file) {
  if (!fs.existsSync(file)) return {};
  return parseEnvironment(fs.readFileSync(file, 'utf8'));
}

let values =
  readEnvironment(
    mode === 'production'
      ? '.env.production'
      : '.env.staging',
  );

if (
  mode === 'production'
  && !Object.keys(values).length
) {
  values = readEnvironment('.env.staging');
}

const expectedProject =
  process.env.VITE_FIREBASE_PROJECT_ID
  || values.VITE_FIREBASE_PROJECT_ID;

const expectedRegion =
  process.env.VITE_FIREBASE_FUNCTIONS_REGION
  || values.VITE_FIREBASE_FUNCTIONS_REGION
  || 'asia-southeast1';

assert.ok(
  expectedProject,
  'Expected Firebase project is unavailable.',
);

const dist = path.resolve('dist');
const assetDir = path.join(dist, 'assets');

assert.equal(
  fs.existsSync(assetDir),
  true,
  'dist/assets is missing.',
);

const jsFiles =
  fs.readdirSync(assetDir)
    .filter((file) => file.endsWith('.js'));

assert.ok(
  jsFiles.length > 0,
  'No compiled JavaScript was found.',
);

const combined =
  jsFiles.map(
    (file) =>
      fs.readFileSync(
        path.join(assetDir, file),
        'utf8',
      ),
  ).join('\n');

const badgeIndex = combined.indexOf('environment-badge');

assert.ok(
  badgeIndex >= 0,
  'Compiled environment badge was not found.',
);

const badgeSnippet =
  combined.slice(
    badgeIndex,
    badgeIndex + 700,
  ).toLowerCase();

assert.ok(
  badgeSnippet.includes(mode.toLowerCase()),
  `Compiled environment badge is not ${mode}.`,
);

assert.ok(
  combined.includes(expectedProject),
  'Compiled Firebase project does not match the verified build configuration.',
);

assert.ok(
  combined.includes(expectedRegion),
  'Compiled Functions region does not match the verified build configuration.',
);

const release =
  JSON.parse(
    fs.readFileSync(
      'release.json',
      'utf8',
    ),
  );

const serviceWorker =
  fs.readFileSync(
    path.join(dist, 'sw.js'),
    'utf8',
  );

assert.ok(
  serviceWorker.includes(
    `bajetbn-shell-v${release.version}`,
  ),
  'Service worker does not match release.json.',
);

function walk(directory) {
  return fs.readdirSync(
    directory,
    {
      withFileTypes: true,
    },
  ).flatMap(
    (entry) => {
      const full = path.join(directory, entry.name);

      return entry.isDirectory()
        ? walk(full)
        : [full];
    },
  );
}

if (mode === 'production') {
  const maps =
    walk(dist).filter(
      (file) => file.endsWith('.map'),
    );

  assert.equal(
    maps.length,
    0,
    'Production dist must not contain source maps.',
  );
}

console.log(
  [
    `Built environment verification PASS (${mode}).`,
    `Firebase project: ${expectedProject}.`,
    `Functions region: ${expectedRegion}.`,
    `JavaScript chunks scanned: ${jsFiles.length}.`,
  ].join(' '),
);
