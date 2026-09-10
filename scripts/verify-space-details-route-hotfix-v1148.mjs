import fs from 'node:fs';

const app =
  fs.readFileSync(
    'src/app/App.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const failures = [];

function check(value, label) {
  if (value) {
    console.log('PASS:', label);
  } else {
    console.error('FAIL:', label);
    failures.push(label);
  }
}

check(
  app.includes(
    "import { SpaceDetailsPage } from '../features/spaces/SpaceDetailsPage';",
  ),
  'SpaceDetailsPage uses a static import.',
);

check(
  !app.includes(
    "lazy(() => import('../features/spaces/SpaceDetailsPage')",
  ),
  'SpaceDetailsPage is not route-level lazy loaded.',
);

check(
  app.includes(
    '<Route path="spaces/:spaceId" element={<SpaceDetailsPage />} />',
  ),
  'Existing Space details route remains intact.',
);

check(
  app.includes(
    "const SpacesPage = lazy(",
  ),
  'Spaces listing remains lazy-loaded.',
);

if (failures.length) {
  throw new Error(
    `Space route hotfix verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'SPACE DETAILS ROUTE HOTFIX VERIFIER: PASS',
);