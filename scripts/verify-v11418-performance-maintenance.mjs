import fs from 'node:fs';

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
  } else {
    console.error('FAIL:', message);
    failures.push(message);
  }
}

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

const buildApp =
  fs.readFileSync(
    'scripts/build-app.mjs',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const workflow =
  fs.readFileSync(
    '.github/workflows/staging-ci.yml',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const spaceDetails =
  fs.readFileSync(
    'src/features/spaces/SpaceDetailsPage.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const firebaseService =
  fs.readFileSync(
    'src/services/firebase.ts',
    'utf8',
  );

const main =
  fs.readFileSync(
    'src/main.tsx',
    'utf8',
  );

const tripVerifier =
  fs.readFileSync(
    'scripts/verify-trip-v2-foundation.mjs',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const householdVerifier =
  fs.readFileSync(
    'scripts/verify-household-v2-command-centre.mjs',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const smeVerifier =
  fs.readFileSync(
    'scripts/verify-sme-v2-operations-command-centre.mjs',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const collectionVerifier =
  fs.readFileSync(
    'scripts/verify-collection-v2-command-centre.mjs',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const chatVerifier =
  fs.readFileSync(
    'scripts/verify-space-chat.mjs',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const reminderVerifier =
  fs.readFileSync(
    'scripts/verify-space-reminders-automation.mjs',
    'utf8',
  ).replace(/\r\n?/g, '\n');

check(
  pkg.version === '1.14.18'
    && release.version === '1.14.18'
    && release.label === 'BajetBN v1.14.18',
  'v1.14.18 package and release metadata are aligned.',
);

check(
  pkg.scripts['build:staging']
    === 'node scripts/build-app.mjs staging'
    && pkg.scripts['build:staging:ci']
      === 'node scripts/build-app.mjs staging --skip-typecheck'
    && pkg.scripts['postbuild:staging:ci']
      === 'node scripts/generate-service-worker.mjs',
  'Normal staging builds retain TypeScript while CI has an explicit validated fast path.',
);

check(
  /const\s+skipTypecheck\s*=\s*process\.argv\.includes\(\s*['"]--skip-typecheck['"]\s*,?\s*\);/.test(
    buildApp,
  )
    && /if\s*\(\s*skipTypecheck\s*&&\s*mode\s*!==\s*['"]staging['"]\s*\)/.test(
      buildApp,
    )
    && /if\s*\(\s*!skipTypecheck\s*\)/.test(
      buildApp,
    ),
  'Build helper only allows TypeScript skipping for the explicit staging CI path.',
);

const typecheckIndex =
  workflow.indexOf(
    '- name: TypeScript validation',
  );

const performanceIndex =
  workflow.indexOf(
    '- name: Run v1.14.18 performance maintenance checks',
  );

const stagingBuildIndex =
  workflow.indexOf(
    '- name: Build staging',
  );

check(
  typecheckIndex >= 0
    && performanceIndex > typecheckIndex
    && stagingBuildIndex > performanceIndex
    && workflow.includes(
      'run: npm run build:staging:ci',
    ),
  'Staging CI typechecks before using the no-duplicate-typecheck build.',
);

check(
  workflow.includes(
    'run: npm run verify:v11418-performance',
  ),
  'Staging CI runs the v1.14.18 performance-maintenance verifier.',
);

const deferredModules = [
  "../collaboration/CollaborationPage",
  "../transactions/TransactionsPage",
  "../collaboration/SpaceChatPanel",
  "../collaboration/SpaceReminderAutomationPanel",
  "./SharedExpensesPanel",
  "./SpaceFundPanel",
  "./SpaceWorkPanel",
  "./HouseholdCommandCentre",
  "./TripCommandCentre",
  "./CollectionCommandCentre",
  "./SmeOperationsCommandCentre",
  "./MarketplaceSpaceManagementSection",
  "./SpaceAvatarSettings",
];

check(
  deferredModules.every(
    (specifier) =>
      spaceDetails.includes(
        `import('${specifier}')`,
      ),
  ),
  'Conditional Space modules are loaded on demand.',
);

check(
  !spaceDetails.includes(
    "import { CollaborationPage, type CollaborationTab } from '../collaboration/CollaborationPage';",
  )
    && !spaceDetails.includes(
      "import { MoneyActivityModal } from '../transactions/TransactionsPage';",
    )
    && !spaceDetails.includes(
      "import { SpaceWorkPanel } from './SpaceWorkPanel';",
    )
    && !spaceDetails.includes(
      "import { SharedExpensesPanel } from './SharedExpensesPanel';",
    ),
  'Large conditional Space modules are no longer statically bundled into SpaceDetails.',
);

check(
  spaceDetails.includes(
    'Loading Space module...',
  )
    && spaceDetails.includes(
      '<Suspense',
    ),
  'Deferred Space modules have a local loading boundary.',
);

check(
  spaceDetails.includes(
    "import { SpaceActionHub } from './SpaceActionHub';",
  )
    && spaceDetails.includes(
      "import { SmeOperationalAttentionPanel } from './SmeOperationalAttentionPanel';",
    ),
  'Core Space overview content stays eager for fast first paint.',
);

check(
  pkg.dependencies.firebase
    && pkg.dependencies['react-dom']
    && firebaseService.includes(
      "from 'firebase/app'",
    )
    && firebaseService.includes(
      "from 'firebase/firestore'",
    )
    && main.includes(
      "from 'react-dom/client'",
    ),
  'Firebase and react-dom are retained because the audit false positives are subpath imports.',
);

check(
  pkg.scripts['verify:v11418-performance']
    === 'node scripts/verify-v11418-performance-maintenance.mjs',
  'v1.14.18 verifier is registered.',
);

const spaceActionHub =
  fs.readFileSync(
    'src/features/spaces/SpaceActionHub.tsx',
    'utf8',
  ).replace(/\r\n?/g, '\n');

const deferredActionModules = [
  "../collaboration/CollaborationPage",
  "../transactions/TransactionsPage",
  "./SharedExpensesPanel",
  "./SpaceFundPanel",
  "./TripPlanningPanel",
  "./SpaceWorkPanel",
];

check(
  deferredActionModules.every(
    (specifier) =>
      spaceActionHub.includes(
        `import('${specifier}')`,
      ),
  ),
  'Space launcher tools are loaded on demand.',
);

check(
  !spaceActionHub.includes(
    "import { CollaborationPage } from '../collaboration/CollaborationPage';",
  )
    && !spaceActionHub.includes(
      "import { MoneyActivityModal } from '../transactions/TransactionsPage';",
    )
    && !spaceActionHub.includes(
      "import { SharedExpensesPanel } from './SharedExpensesPanel';",
    )
    && !spaceActionHub.includes(
      "import { SpaceFundPanel } from './SpaceFundPanel';",
    )
    && !spaceActionHub.includes(
      "import { TripPlanningPanel } from './TripPlanningPanel';",
    )
    && !spaceActionHub.includes(
      "import { SpaceWorkPanel } from './SpaceWorkPanel';",
    ),
  'Space launcher no longer eagerly bundles tool workspaces.',
);

check(
  spaceActionHub.includes(
    'Loading Money Activity...',
  )
    && spaceActionHub.includes(
      'Loading Space tool...',
    )
    && spaceActionHub.includes(
      '<Suspense',
    ),
  'Deferred launcher tools have local loading boundaries.',
);

check(
  tripVerifier.includes(
    `"import('./TripCommandCentre')"`,
  )
    && householdVerifier.includes(
      `"import('./HouseholdCommandCentre')"`,
    )
    && smeVerifier.includes(
      `"import('./SmeOperationsCommandCentre')"`,
    )
    && !tripVerifier.includes(
      `"import { TripCommandCentre } from './TripCommandCentre';"`,
    )
    && !householdVerifier.includes(
      `"import { HouseholdCommandCentre } from './HouseholdCommandCentre';"`,
    )
    && !smeVerifier.includes(
      `"import { SmeOperationsCommandCentre } from './SmeOperationsCommandCentre';"`,
    ),
  'Historical command-centre verifiers accept the v1.14.18 dynamic load path.',
);

check(
  collectionVerifier.includes(
    `"import('./CollectionCommandCentre')"`,
  )
    && chatVerifier.includes(
      `"import('../collaboration/SpaceChatPanel')"`,
    )
    && reminderVerifier.includes(
      `"import('../collaboration/SpaceReminderAutomationPanel')"`,
    )
    && !collectionVerifier.includes(
      `"import { CollectionCommandCentre } from './CollectionCommandCentre';"`,
    )
    && !chatVerifier.includes(
      `"import { SpaceChatPanel } from '../collaboration/SpaceChatPanel';"`,
    )
    && !reminderVerifier.includes(
      `"import { SpaceReminderAutomationPanel } from '../collaboration/SpaceReminderAutomationPanel';"`,
    ),
  'Historical Collection, Chat, and reminder verifiers accept dynamic Space loads.',
);

if (failures.length) {
  throw new Error(
    `v1.14.18 performance-maintenance verification failed: ${failures.length} check(s).`,
  );
}

console.log(
  'BajetBN v1.14.18 performance + maintenance verification PASS.',
);
