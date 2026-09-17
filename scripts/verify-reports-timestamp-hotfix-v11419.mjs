import assert from 'node:assert/strict';
import fs from 'node:fs';

const page =
  fs.readFileSync(
    'src/features/reports/ReportsPage.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const metrics =
  fs.readFileSync(
    'src/features/reports/reportingMetrics.ts',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const pkg =
  JSON.parse(
    fs.readFileSync(
      'package.json',
      'utf8',
    ),
  );

const release =
  JSON.parse(
    fs.readFileSync(
      'release.json',
      'utf8',
    ),
  );

function versionAtLeast(
  value,
  floor,
) {
  const current =
    String(value)
      .split('.')
      .map(Number);

  const minimum =
    String(floor)
      .split('.')
      .map(Number);

  for (
    let index = 0;
    index < 3;
    index += 1
  ) {
    const currentPart =
      current[index]
      || 0;

    const minimumPart =
      minimum[index]
      || 0;

    if (
      currentPart
      > minimumPart
    ) {
      return true;
    }

    if (
      currentPart
      < minimumPart
    ) {
      return false;
    }
  }

  return true;
}

assert.equal(
  pkg.version,
  release.version,
  'Package and release versions must stay aligned.',
);

assert.equal(
  release.label,
  `BajetBN v${release.version}`,
  'Release label must match the release version.',
);

assert.equal(
  versionAtLeast(
    pkg.version,
    '1.14.19',
  ),
  true,
  'The v1.14.19 timestamp fix must remain present in later releases.',
);

for (
  const marker
  of [
    'export function reportPostedAtMillis(',
    'typeof timestamp.toMillis',
    'timestamp.seconds',
    'timestamp._seconds',
    'timestamp.nanoseconds',
    'timestamp._nanoseconds',
    'reportPostedAtMillis(\n      b.postedAt,',
    'reportPostedAtMillis(\n      a.postedAt,',
  ]
) {
  assert.equal(
    metrics.includes(
      marker,
    ),
    true,
    `Missing v1.14.19-compatible timestamp marker: ${marker}`,
  );
}

assert.equal(
  page.includes(
    'mergeReportTransactions(',
  ),
  true,
  'Money Reports must use the transport-safe shared merge path.',
);

assert.equal(
  page.includes(
    'postedAt?.toMillis()',
  )
    || metrics.includes(
      'postedAt?.toMillis()',
    ),
  false,
  'Reports must not directly call postedAt?.toMillis().',
);

console.log(
  'BajetBN v1.14.19 Reports timestamp compatibility verification PASS.',
);
