import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\r\n?/g, '\n');

const hub =
  read(
    'src/features/spaces/SpaceActionHub.tsx',
  );

const details =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const section =
  read(
    'src/features/spaces/MarketplaceSpaceManagementSection.tsx',
  );

const marketplace =
  read(
    'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  );

const failures = [];

function check(ok, label) {
  if (ok) {
    console.log(
      'PASS:',
      label,
    );
  } else {
    console.error(
      'FAIL:',
      label,
    );
    failures.push(
      label,
    );
  }
}

check(
  hub.includes(
    '?section=marketplace-listings',
  )
  && hub.includes(
    '?section=marketplace-sellers',
  )
  && hub.includes(
    '?section=marketplace-payouts',
  )
  && hub.includes(
    '?section=marketplace-customers',
  )
  && hub.includes(
    '?section=marketplace-reports',
  ),
  'Marketplace management links stay inside Business Space.',
);

check(
  !hub.includes(
    '/pos?tab=listings',
  )
  && !hub.includes(
    '/pos?tab=sellers',
  )
  && !hub.includes(
    '/pos?tab=payouts',
  )
  && !hub.includes(
    '/pos?tab=customers',
  )
  && !hub.includes(
    '/pos?tab=reports',
  ),
  'Business Space no longer routes management sections through POS page.',
);

check(
  hub.includes(
    'to={`/spaces/${space.id}/pos`}',
  ),
  'Dedicated POS route remains available for Register and Sales.',
);

check(
  details.includes(
    'MarketplaceSpaceManagementSection',
  )
  && details.includes(
    'marketplaceInlineSection',
  ),
  'SpaceDetails renders inline Marketplace management.',
);

check(
  details.includes(
    '&& !marketplaceInlineSection',
  )
  && details.includes(
    'householdInlineSection\n      || marketplaceInlineSection',
  ),
  'Generic Business overview is hidden while Marketplace management is open.',
);

check(
  section.includes(
    'getSmePosSettings',
  )
  && section.includes(
    'getBusinessProfile',
  )
  && section.includes(
    'data-marketplace-space-management',
  ),
  'Inline wrapper loads existing Marketplace frontend data.',
);

check(
  section.includes(
    '`marketplace-${nextTab}`',
  ),
  'Internal management tabs update the Business Space section URL.',
);

check(
  marketplace.includes(
    'embeddedManagementTab',
  )
  && marketplace.includes(
    'onManagementTabChange',
  )
  && marketplace.includes(
    'MarketplaceManagementTab',
  ),
  'Marketplace workspace supports embedded management mode.',
);

check(
  marketplace.includes(
    'Marketplace — Listings',
  )
  && marketplace.includes(
    'Marketplace — Sellers',
  )
  && marketplace.includes(
    'Marketplace — Payouts',
  )
  && marketplace.includes(
    'Marketplace — Customers',
  )
  && marketplace.includes(
    'Marketplace — Reports',
  ),
  'Existing Marketplace management capabilities remain intact.',
);

if (failures.length) {
  throw new Error(
    `Marketplace inline v1.14.11 verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'MARKETPLACE INLINE v1.14.11 VERIFIER: PASS',
);