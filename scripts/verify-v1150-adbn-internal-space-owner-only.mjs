import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\r\n?/g, '\n');

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

const access =
  read('src/utils/adbnTechAccess.ts');

const spaces =
  read('src/features/spaces/SpacesPage.tsx');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const business =
  read('src/features/business/BusinessHomePage.tsx');

const collaboration =
  read('src/repositories/collaborationRepository.ts');

const spaceRepo =
  read('src/repositories/spaceRepository.ts');

const rules =
  read('firestore.rules');

const app =
  read('src/app/App.tsx');

const customerLinks =
  read(
    'src/repositories/adbnCustomerLinkRepository.ts',
  );

check(
  access.includes(
    "BAJETBN_ADBN_OWNER_EMAIL",
  ),
  'Owner identity is centralized.',
);

check(
  access.includes(
    "externalIntegrationRole\n      === 'customer'",
  ),
  'Customer ADBN Spaces are explicitly exempt.',
);

check(
  spaces.includes(
    'canAccessInternalAdbnTechSpace',
  ),
  'Spaces list protects internal ADBN Space.',
);

check(
  details.includes(
    'This ADBN TECH internal Space is private to its owner.',
  ),
  'SpaceDetails blocks direct internal access.',
);

check(
  business.includes(
    'This ADBN TECH internal Space is private to its owner.',
  ),
  'BusinessHome blocks direct internal access.',
);

check(
  collaboration.includes(
    'cannot invite normal Space members',
  ),
  'Internal ADBN Space cannot use normal Space invitations.',
);

check(
  spaceRepo.includes(
    "externalIntegrationRole:\n        'business'",
  )
  && spaceRepo.includes(
    "externalIntegrationRole: 'business'",
  ),
  'Internal ADBN Space is explicitly marked business/internal.',
);

check(
  rules.includes(
    'function isInternalAdbnTechSpaceData',
  )
  && rules.includes(
    "data.externalIntegrationRole\n            != 'customer'",
  ),
  'Firestore separates internal and customer ADBN Spaces.',
);

check(
  rules.includes(
    "request.auth.token.email.lower()\n          == 'zardeerwandy@gmail.com'",
  ),
  'Firestore restricts internal ADBN access to approved owner.',
);

check(
  rules.includes(
    'return hasActiveSpaceMembership(spaceId);',
  )
  && rules.includes(
    'canAccessInternalAdbnTechSpaceData(resource.data);',
  )
  && !rules.includes(
    'canAccessSpaceByIntegration(spaceId)',
  ),
  'Firestore keeps normal Space membership queries lightweight while protecting the internal ADBN Space document.',
);

check(
  app.includes(
    '<Route path="adbn-links" element={<AdbnCustomerLinksPage />} />',
  ),
  'Customer ADBN link route remains enabled.',
);

check(
  app.includes(
    '<Route path="spaces/:spaceId/adbn" element={<AdbnCustomerSpacePage />} />',
  ),
  'Customer ADBN Space route remains enabled.',
);

check(
  customerLinks.includes(
    'createAdbnCustomerLinkInvitation',
  )
  && customerLinks.includes(
    'respondAdbnCustomerLinkInvitation',
  ),
  'Customer invitation flow remains enabled.',
);

check(
  !fs.existsSync(
    'src/config/adbnTechPolicy.ts',
  ),
  'Wrong customer portal disabling patch is absent.',
);

console.log('');
console.log('============================================================');
console.log(' ADBN INTERNAL SPACE OWNER-ONLY VERIFY: PASS');
console.log(' Internal ADBN Business Space: OWNER ONLY');
console.log(' Customer ADBN Spaces: PRESERVED');
console.log(' Customer invitations: PRESERVED');
console.log(' Customer portal routes: PRESERVED');
console.log('============================================================');
