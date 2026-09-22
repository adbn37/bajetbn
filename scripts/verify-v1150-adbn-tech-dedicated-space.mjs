import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(
    path,
    'utf8',
  ).replace(/\r\n?/g, '\n');

const spaces =
  read(
    'src/features/spaces/SpacesPage.tsx',
  );

const home =
  read(
    'src/features/business/BusinessHomePage.tsx',
  );

const repository =
  read(
    'src/repositories/spaceRepository.ts',
  );

const css =
  read(
    'src/styles/global.css',
  );

function check(value, label) {
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
  spaces.includes(
    "=== 'zardeerwandy@gmail.com'"
  ),
  'Dedicated ADBN TECH Space provisioning is restricted to the requested account.',
);

check(
  spaces.includes(
    "name: 'ADBN TECH'"
  )
  && spaces.includes(
    "type: 'sme'"
  ),
  'Provision action creates a real ADBN TECH Business Space.',
);

check(
  spaces.includes(
    'await prepareAdbnTechIntegration('
  ),
  'New ADBN TECH Space is immediately marked as the integration Space.',
);

check(
  spaces.includes(
    "data-adbn-tech-space-setup"
  )
  && spaces.includes(
    'Create ADBN TECH Space'
  ),
  'Spaces page exposes a visible ADBN TECH setup entry before creation.',
);

check(
  spaces.includes(
    "item.externalIntegrationProvider\n              !== 'adbn_tech'\n            || canProvisionAdbnTechSpace"
  ),
  'ADBN TECH integration Space is hidden from other BajetBN accounts for now.',
);

check(
  spaces.includes(
    "? 'ADBN TECH'\n            : labels[space.type]"
  ),
  'Created Space receives an ADBN TECH badge in the Spaces grid.',
);

check(
  home.includes(
    "space.externalIntegrationProvider\n        === 'adbn_tech'"
  )
  && home.includes(
    "=== 'adbn tech'"
  ),
  'Business Setup ADBN TECH card is limited to the dedicated ADBN TECH Space.',
);

check(
  repository.includes(
    'export async function prepareAdbnTechIntegration'
  ),
  'Existing integration marker helper is reused.',
);

check(
  css.includes(
    'BAJETBN V115 ADBN TECH DEDICATED SPACE'
  ),
  'Dedicated ADBN TECH setup styling exists.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 ADBN TECH DEDICATED SPACE: PASS',
);
