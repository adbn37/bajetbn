import fs from 'node:fs';
import path from 'node:path';

const extensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.css',
  '.html',
  '.json',
]);

const files = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    const target = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(target);
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(target);
    }
  }
}

walk('src');
walk('public');

if (fs.existsSync('index.html')) {
  files.push('index.html');
}

const checks = [
  ['U+00C2 mojibake marker', /\u00c2/u],
  ['U+00C3 mojibake marker', /\u00c3/u],
  ['broken UTF-8 punctuation', /\u00e2/u],
  ['replacement character', /\ufffd/u],
  [
    'double-encoded replacement character',
    /\u00ef\u00bf\u00bd/u,
  ],
  [
    'broken Space role separator',
    /Owner\s+\?\s+Shared Space/u,
  ],
];

const failures = [];
let safeSeparators = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  safeSeparators += (
    text.match(/\u00b7/gu) ?? []
  ).length;

  const lines = text.split(/\r?\n/u);

  lines.forEach((line, index) => {
    for (const [label, pattern] of checks) {
      if (pattern.test(line)) {
        failures.push(
          `${file}:${index + 1}: ${label}`,
        );
      }
    }
  });
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(
  `UI encoding checks passed (${files.length} files, `
  + `${safeSeparators} safe separators).`,
);