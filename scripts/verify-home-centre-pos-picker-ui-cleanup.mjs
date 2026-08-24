import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(`UI cleanup verification failed: ${message}`);
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function walk(root) {
  const results = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);

    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (/\.(?:ts|tsx|js|mjs|css|json)$/.test(entry.name)) {
      results.push(full);
    }
  }

  return results;
}

const shell = read('src/layouts/AppShell.tsx');

for (const required of [
  "title=\"Choose a Business POS\"",
  'const smeSpaces = accessibleSpaces.filter',
  "space.type === 'sme' && !space.archivedAt",
  'Which Business would you like to open?',
  'mobile-bottom-add',
]) {
  if (!shell.includes(required)) {
    fail(`AppShell is missing: ${required}`);
  }
}

if (
  shell.includes('mobileCenterPath')
  || shell.includes('mobileCenterLabel')
) {
  fail('The old dynamic Money/POS centre navigation still exists.');
}

const posIndex = shell.indexOf('<small>POS</small>');
const homeIndex = shell.indexOf('<small>Home</small>');
const addIndex = shell.indexOf('<small>Add</small>');
const alertsIndex = shell.indexOf('<small>Alerts</small>');
const moreIndex = shell.indexOf('<small>More</small>');

if (
  !(
    posIndex >= 0
    && posIndex < homeIndex
    && homeIndex < addIndex
    && addIndex < alertsIndex
    && alertsIndex < moreIndex
  )
) {
  fail('Mobile navigation order must be POS, Home, Add, Alerts, More.');
}

const css = read('src/styles/global.css');

for (const required of [
  '.pos-space-picker-option {',
  '.mobile-bottom-nav button.active {',
]) {
  if (!css.includes(required)) {
    fail(`Mobile navigation or POS picker styling is missing: ${required}`);
  }
}

const collaboration = read(
  'src/features/collaboration/CollaborationPage.tsx',
);

for (const forbidden of [
  'member.displayName || member.email || member.uid',
  'member.email || member.uid',
]) {
  if (collaboration.includes(forbidden)) {
    fail(`Visible Firebase UID fallback remains: ${forbidden}`);
  }
}

const forbiddenEncoding = [
  '\u00c2\u00b7',
  '\u00e2\u20ac\u00a6',
  '\u00e2\u20ac\u201d',
  '\u00e2\u20ac\u201c',
  '\u00c3\u2014',
  '\ufffd',
  '} ? SME`',
  '} ? Shared Space`',
];

const offenders = [];

for (const file of walk('src')) {
  const source = read(file);

  for (const value of forbiddenEncoding) {
    if (source.includes(value)) {
      offenders.push(`${file}: ${JSON.stringify(value)}`);
    }
  }
}

if (offenders.length) {
  fail(`Encoding artifacts remain:\n${offenders.join('\n')}`);
}

console.log(
  'POS-first navigation, Business POS chooser, UID safety and encoding verification passed.',
);
