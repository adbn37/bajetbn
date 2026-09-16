import fs from 'node:fs';

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
  } else {
    failures.push(message);
    console.error('FAIL:', message);
  }
}

const packageJson =
  JSON.parse(
    fs.readFileSync(
      'package.json',
      'utf8',
    ),
  );

const barcode =
  fs.readFileSync(
    'src/components/BarcodeCameraScanner.tsx',
    'utf8',
  );

const collection =
  fs.readFileSync(
    'src/features/collection/CollectionInventoryPage.tsx',
    'utf8',
  );

const pos =
  fs.readFileSync(
    'src/features/sme-pos/SmePosPage.tsx',
    'utf8',
  );

const vite =
  fs.readFileSync(
    'vite.config.ts',
    'utf8',
  );

const deploy =
  fs.readFileSync(
    'scripts/deploy-production.ps1',
    'utf8',
  );

const targets =
  JSON.parse(
    fs.readFileSync(
      'config/release-targets.json',
      'utf8',
    ),
  );

const dailyOperations =
  fs.readFileSync(
    'scripts/verify-sme-pos-daily-operations.mjs',
    'utf8',
  );

const spaceFirstFinal =
  fs.readFileSync(
    'scripts/verify-space-first-final.mjs',
    'utf8',
  );

const personalFullModules =
  fs.readFileSync(
    'scripts/verify-personal-full-modules-v111.mjs',
    'utf8',
  );

const sharedSpaceFullActions =
  fs.readFileSync(
    'scripts/verify-shared-space-full-actions-v111.mjs',
    'utf8',
  );

const sellerSelfService =
  fs.readFileSync(
    'scripts/verify-seller-self-service-payouts.mjs',
    'utf8',
  );

const smePosPage =
  fs.readFileSync(
    'src/features/sme-pos/SmePosPage.tsx',
    'utf8',
  );

const marketplacePos1148 =
  fs.readFileSync(
    'scripts/verify-marketplace-pos-v1148.mjs',
    'utf8',
  );

const releaseGate11412 =
  fs.readFileSync(
    'scripts/verify-v11412-release-gate.mjs',
    'utf8',
  );

check(
  packageJson.scripts.build
    === 'node scripts/build-app.mjs production',
  'Default build uses explicit production environment injection.',
);

check(
  packageJson.scripts['build:staging']
    === 'node scripts/build-app.mjs staging',
  'Staging build uses explicit staging environment injection.',
);

check(
  packageJson.scripts['verify:all-structural']
    .endsWith(
      '&& node scripts/verify-v11417-hardening.mjs',
    )
    && !packageJson.scripts['verify:all-structural']
      .includes(
        'npmrun verify:v11417-hardening',
      ),
  'Full structural suite ends with the direct v1.14.17 verifier.',
);

check(
  barcode.includes("import('@zxing/browser')")
    && barcode.includes("import('@zxing/library')")
    && !barcode.includes("from '@zxing/library'")
    && !barcode.includes('BrowserMultiFormatReader, type'),
  'ZXing runtime libraries load only when the camera starts.',
);

check(
  collection.includes("import('@bwip-js/browser')")
    && !collection.includes(
      "import * as bwipjs from '@bwip-js/browser'",
    ),
  'Barcode label rendering library loads only when a label is rendered.',
);

check(
  pos.includes('lazy(')
    && pos.includes(
      "import('./MarketplaceConsignmentPosWorkspace')",
    )
    && pos.includes(
      "import('./StandardPosWorkspace')",
    )
    && pos.includes('<Suspense'),
  'POS loads only the selected workspace mode.',
);

check(
  vite.includes(
    "sourcemap: mode !== 'production'",
  ),
  'Production source maps are disabled while staging keeps them.',
);

check(
  deploy.includes(
    'verify:built-environment-v11417',
  )
    && deploy.includes(
      'precache-manifest.json',
    ),
  'Production deployment verifies the built environment and live artifact.',
);

check(
  targets.production.cloudflareProject === 'bajetbn'
    && targets.production.url === 'https://bajetbn.com'
    && targets.production.automaticDeployments === 'disabled',
  'Production target configuration matches the controlled Cloudflare workflow.',
);

check(
  targets.production.firebaseProject === 'bajetbn-staging'
    && targets.production.sharedFirebaseBackend === true,
  'Shared Firebase backend is explicit instead of implicit.',
);

check(
  targets.production.url === 'https://bajetbn.com'
    && targets.production.cloudflareProject === 'bajetbn'
    && targets.production.automaticDeployments === 'disabled',
  'Production target is the controlled bajetbn.com deployment.',
);

check(
  dailyOperations.includes(
    'Marketplace POS booking capability',
  )
    && !dailyOperations.includes(
      'Marketplace booking UI removed',
    ),
  'Marketplace booking verifier matches the restored current workflow.',
);

check(
  spaceFirstFinal.includes(
    `marketplacePos.includes(
      "bookings: 'Bookings'",
    )`,
  )
    && spaceFirstFinal.includes(
      "marketplacePos.includes(\n      'SmePosReservationsPanel'",
    ),
  'Final Space-first verifier retains Marketplace bookings/reservations.',
);

check(
  personalFullModules.includes(
    "'getSpaceCommitmentWorkspace'",
  )
    && personalFullModules.includes(
      'Space-scoped and commitment-addressable',
    ),
  'Personal Bills verifier matches the current scoped commitment workspace.',
);

check(
  sharedSpaceFullActions.includes(
    "'Loading Business Bills'",
  )
    && sharedSpaceFullActions.includes(
      "'Loading Business Instalments'",
    )
    && sharedSpaceFullActions.includes(
      "'getSpaceCommitmentWorkspace'",
    )
    && !sharedSpaceFullActions.includes(
      "'Loading Business Bills & Instalments'",
    ),
  'Shared Space verifier matches the split Business Bills/Instalments modules.',
);

check(
  sellerSelfService.includes(
    "const compact = (value)",
  )
    && sellerSelfService.includes(
      "compact(text).includes",
    ),
  'Seller self-service verifier tolerates harmless source line wrapping.',
);

check(
  !smePosPage.includes(
    'listSpaceMembers',
  )
    && !smePosPage.includes(
      'roleLabels',
    )
    && !smePosPage.includes(
      'currentMember',
    )
    && smePosPage.includes(
      'queueMicrotask',
    ),
  'POS page removes unused member load/state and defers initial load outside the effect body.',
);

check(
  marketplacePos1148.includes(
    "['register', 'bookings', 'sales']",
  )
    && marketplacePos1148.includes(
      'Marketplace Bookings UI is retained.',
    )
    && !marketplacePos1148.includes(
      'Marketplace Bookings UI is removed.',
    ),
  'Marketplace v1.14.8 regression gate retains restored Bookings.',
);

check(
  releaseGate11412.includes(
    'atLeast11412',
  )
    && releaseGate11412.includes(
      'package-lock.json matches package.json.',
    )
    && releaseGate11412.includes(
      'release.json matches package.json.',
    ),
  'v1.14.12 regression gate supports newer compatible releases.',
);

check(
  releaseGate11412.includes(
    '/\\$StagingProject\\s*=\\s*"bajetbn-staging"/',
  )
    && !releaseGate11412.includes(
      '$StagingProject    = "bajetbn-staging"',
    ),
  'v1.14.12 deployment regression gate ignores harmless PowerShell alignment spacing.',
);

if (failures.length) {
  throw new Error(
    `v1.14.17 hardening verification failed: ${failures.length} check(s).`,
  );
}

console.log(
  'BajetBN v1.14.17 deployment + performance hardening verification PASS.',
);
