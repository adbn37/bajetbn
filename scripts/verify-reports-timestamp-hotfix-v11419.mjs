import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs
  .readFileSync(
    'src/features/reports/ReportsPage.tsx',
    'utf8',
  )
  .replace(/\r\n?/g, '\n');

const pkg = JSON.parse(
  fs.readFileSync('package.json', 'utf8'),
);

const release = JSON.parse(
  fs.readFileSync('release.json', 'utf8'),
);

assert.equal(pkg.version, '1.14.19');
assert.equal(release.version, '1.14.19');
assert.equal(release.label, 'BajetBN v1.14.19');

for (const marker of [
  'function postedAtMillis(value: unknown)',
  'typeof timestamp.toMillis',
  'timestamp.seconds',
  'timestamp._seconds',
  'timestamp.nanoseconds',
  'timestamp._nanoseconds',
  'postedAtMillis(\n                    b.postedAt,',
  'postedAtMillis(\n                    a.postedAt,',
]) {
  assert.equal(
    page.includes(marker),
    true,
    `Missing Reports timestamp hotfix marker: ${marker}`,
  );
}

assert.equal(
  page.includes('postedAt?.toMillis()'),
  false,
  'Reports must not directly call postedAt?.toMillis().',
);

function convert(value) {
  if (value === null || value === undefined) return 0;
  if (value instanceof Date) return value.getTime();

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value !== 'object') return 0;

  if (typeof value.toMillis === 'function') {
    const milliseconds = Number(value.toMillis());
    return Number.isFinite(milliseconds) ? milliseconds : 0;
  }

  const seconds = Number(
    value.seconds
    ?? value._seconds,
  );

  if (!Number.isFinite(seconds)) return 0;

  const nanoseconds = Number(
    value.nanoseconds
    ?? value._nanoseconds
    ?? 0,
  );

  return (
    seconds * 1000
    + (
      Number.isFinite(nanoseconds)
        ? Math.floor(nanoseconds / 1_000_000)
        : 0
    )
  );
}

const expected = 1_725_000_123_456;

assert.equal(
  convert({ toMillis: () => expected }),
  expected,
);

assert.equal(
  convert({
    seconds: 1_725_000_123,
    nanoseconds: 456_000_000,
  }),
  expected,
);

assert.equal(
  convert({
    _seconds: 1_725_000_123,
    _nanoseconds: 456_000_000,
  }),
  expected,
);

assert.equal(
  convert(new Date(expected)),
  expected,
);

assert.equal(
  convert('not-a-date'),
  0,
);

console.log(
  'BajetBN v1.14.19 Reports timestamp hotfix verification PASS.',
);
