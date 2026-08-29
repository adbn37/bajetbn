import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

function requireCheck(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exitCode = 1;
  } else {
    console.log('PASS:', message);
  }
}

const appShell = await read('src/layouts/AppShell.tsx');
const spaces = await read('src/features/spaces/SpaceDetailsPage.tsx');
const spaceRepo = await read('src/repositories/spaceRepository.ts');
const worker = await read('scripts/generate-service-worker.mjs');
const workflow = await read('.github/workflows/staging-ci.yml');
const app = await read('src/app/App.tsx');

requireCheck(
  !appShell.includes('subscribeSpaceActivities'),
  'AppShell no longer opens realtime listeners for every Space.',
);

requireCheck(
  appShell.includes('subscribeUserNotifications'),
  'AppShell retains one user-level realtime notification stream.',
);

requireCheck(
  spaces.includes('await getSpace(spaceId)'),
  'SpaceDetails loads the current Space directly.',
);

requireCheck(
  !spaces.includes('const spaces = await listSpaces(user.uid)'),
  'SpaceDetails no longer loads all Spaces to locate one Space.',
);

requireCheck(
  spaceRepo.includes('export async function getSpace(spaceId: string)'),
  'Direct Space repository primitive exists.',
);

requireCheck(
  !worker.includes('OPTIONAL_URLS.map((url) => fetchAndCache(cache, url, false))'),
  'Service worker does not eagerly download every optional/lazy asset.',
);

requireCheck(
  worker.includes('const PRECACHE_PATHS = new Set([...CRITICAL_URLS, ...OPTIONAL_URLS])'),
  'Optional lazy assets remain runtime-cache eligible.',
);

requireCheck(
  workflow.includes('node-version: 24'),
  'Staging CI uses Node 24.',
);

requireCheck(
  app.includes("lazy(() => import('../features/sme-pos/SmePosPage')"),
  'SME POS remains route-level lazy loaded.',
);

requireCheck(
  app.includes("lazy(() => import('../features/reports/ReportsPage')"),
  'Reports remain route-level lazy loaded.',
);

if (process.exitCode) {
  throw new Error('Space-first runtime structural verification failed.');
}

console.log('\nSpace-first runtime structural verification PASS.');
