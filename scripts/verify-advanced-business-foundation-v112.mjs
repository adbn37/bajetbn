import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const scope =
  JSON.parse(
    read('scope/all-discussed-development.json'),
  );

const models =
  read('src/types/models.ts');

const repository =
  read('src/repositories/businessAdvancedRepository.ts');

const page =
  read('src/features/business/BusinessAdvancedPage.tsx');

const app =
  read('src/app/App.tsx');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');

const rules =
  read('firestore.rules');

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log('PASS:', label);
    return;
  }

  failures.push(label);
  console.error('FAIL:', label);
}

check(
  scope.excluded.some(
    (item) =>
      item.id === 'android.play_store',
  ),
  'Android / Play Store remains explicitly excluded.',
);

check(
  !scope.items.some(
    (item) =>
      item.id.includes('android')
      || item.id.includes('play_store'),
  ),
  'Android work is absent from active development scope.',
);

check(
  models.includes('BusinessProfile')
    && models.includes('BusinessContact')
    && models.includes('BusinessIndustry')
    && models.includes('BusinessContactKind'),
  'Advanced Business models exist.',
);

check(
  repository.includes('getBusinessProfile')
    && repository.includes('saveBusinessProfile')
    && repository.includes('listBusinessContacts')
    && repository.includes('createBusinessContact')
    && repository.includes('updateBusinessContact')
    && repository.includes('setBusinessContactArchived'),
  'Business profile and contacts repository is complete.',
);

check(
  page.includes('Business Profile')
    && page.includes('Customers & Vendors')
    && page.includes('Add Contact')
    && page.includes('Save Contact')
    && page.includes('Save Business Profile'),
  'Visible Business Admin actions are functional.',
);

check(
  page.includes('transport_delivery'),
  'Transport and delivery business classification is available.',
);

check(
  !/coming soon|not implemented|placeholder action/i.test(page),
  'Business Admin contains no placeholder actions.',
);

check(
  app.includes('spaces/:spaceId/business')
    && app.includes('BusinessAdvancedPage'),
  'Business Admin route is registered.',
);

/*
 * Business navigation became industry-aware in v1.14.
 *
 * The canonical Business Admin route remains available,
 * while its visible launcher label adapts to the selected
 * Business type.
 */
check(
  hub.includes(
    'businessAdminLabel',
  )
    && hub.includes(
      "'Renters & Admin'",
    )
    && hub.includes(
      "'Customers & Admin'",
    )
    && hub.includes(
      'to={`/spaces/${space.id}/business`}',
    )
    && hub.includes(
      'isBusinessOwner',
    ),
  'Business Space exposes the current business admin area with an industry-aware label.',
);

check(
  rules.includes('match /businessProfiles/{spaceId}')
    && rules.includes('match /businessContacts/{contactId}')
    && rules.includes('isSpaceOwner'),
  'Business data has owner-scoped rules.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error('- ' + failure);
  }

  throw new Error(
    'Advanced Business foundation failed '
      + failures.length
      + ' structural check(s).',
  );
}

console.log('');
console.log(
  'Advanced Business foundation verification PASS.',
);
