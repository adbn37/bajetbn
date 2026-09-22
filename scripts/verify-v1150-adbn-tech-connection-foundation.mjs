import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(
    path,
    'utf8',
  ).replace(/\r\n?/g, '\n');

const models =
  read(
    'src/types/models.ts',
  );

const repository =
  read(
    'src/repositories/spaceRepository.ts',
  );

const home =
  read(
    'src/features/business/BusinessHomePage.tsx',
  );

const rules =
  read(
    'firestore.rules',
  );

const functions =
  read(
    'functions/src/index.ts',
  );

function check(
  value,
  label,
) {
  if (!value) {
    throw new Error(
      'FAIL: ' + label,
    );
  }

  console.log(
    'PASS: ' + label,
  );
}

check(
  models.includes(
    "export type SpaceExternalIntegrationProvider =\n  | 'adbn_tech';"
  ),
  'ADBN TECH integration provider type exists.',
);

check(
  models.includes(
    "externalIntegrationStatus?: SpaceExternalIntegrationStatus | null;"
  )
  && models.includes(
    "externalIntegrationKey?: string | null;"
  ),
  'Space stores minimal external integration state.',
);

check(
  repository.includes(
    'export async function prepareAdbnTechIntegration'
  )
  && repository.includes(
    "externalIntegrationProvider:\n        'adbn_tech'"
  )
  && repository.includes(
    "externalIntegrationStatus:\n        'prepared'"
  )
  && repository.includes(
    "externalIntegrationKey:\n        'adbntech'"
  ),
  'Repository prepares the BajetBN side of the ADBN TECH connection.',
);

check(
  home.includes(
    'data-adbn-tech-connection'
  )
  && home.includes(
    'Prepare ADBN TECH connection'
  )
  && home.includes(
    'BajetBN side ready'
  ),
  'Business Setup exposes the ADBN TECH connection foundation.',
);

check(
  home.includes(
    "workspaceView === 'setup'\n        && isOwner"
  ),
  'ADBN TECH setup remains inside the owner-only Business Setup workspace.',
);

check(
  home.includes(
    'Customers, invoices, payments, purchases, expenses, refunds and inventory will be connected in later integration slices.'
  ),
  'Connection card states the planned integration scope.',
);

check(
  home.includes(
    'Preparing this Space does not sync or change any ADBN TECH customer, invoice, payment, purchase, expense, refund or inventory record yet.'
  ),
  'Foundation clearly avoids claiming that live sync already exists.',
);

check(
  rules.includes(
    'match /spaces/{spaceId}'
  )
  && rules.includes(
    'allow update: if isSpaceOwner(spaceId)'
  ),
  'Existing Space owner rule protects the integration marker.',
);

check(
  !functions.includes(
    'prepareAdbnTechIntegration'
  ),
  'No new Cloud Function was introduced for Slice 21.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 ADBN TECH CONNECTION FOUNDATION: PASS',
);
