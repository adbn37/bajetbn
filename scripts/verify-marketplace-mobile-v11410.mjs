import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\r\n?/g, '\n');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');

const home =
  read(
    'src/features/spaces/SmeOperationalAttentionPanel.tsx',
  );

const page =
  read(
    'src/features/sme-pos/SmePosPage.tsx',
  );

const marketplace =
  read(
    'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  );

const css =
  read('src/styles/global.css');

const failures = [];

function check(ok, label) {
  if (ok) {
    console.log('PASS:', label);
  } else {
    console.error('FAIL:', label);
    failures.push(label);
  }
}

check(
  hub.includes(
    'data-business-industry={',
  ),
  'Marketplace Space navigation exposes its industry.',
);

check(
  css.includes(
    "data-business-industry='marketplace'",
  )
  && css.includes(
    'repeat(\n        3,\n        minmax(0, 1fr)',
  ),
  'Marketplace mobile navigation uses a three-column grid.',
);

check(
  home.includes(
    'marketplace-space-summary-grid',
  )
  && css.includes(
    '.marketplace-space-summary-grid',
  ),
  'Marketplace overview has responsive summary styling.',
);

check(
  css.includes(
    'grid-column: 1 / -1;',
  ),
  'Final Marketplace overview card spans the last mobile row.',
);

check(
  css.includes(
    '8.5rem',
  )
  && css.includes(
    '.sme-pos-page,',
  )
  && css.includes(
    '.space-details-page',
  ),
  'Pages reserve space above fixed bottom navigation.',
);

check(
  page.includes(
    '/pos/archived',
  )
  && page.includes(
    'Archived',
  )
  && !marketplace.includes(
    '/pos/archived',
  ),
  'Archived moved into POS header actions.',
);

check(
  !marketplace.includes(
    "import { Link, useSearchParams }",
  ),
  'Marketplace workspace removed obsolete Link import.',
);

check(
  css.includes(
    '.sme-pos-checkout-products',
  )
  && css.includes(
    'grid-template-columns:\n      repeat(\n        2,',
  ),
  'Register actions use compact mobile grid.',
);

check(
  css.includes(
    '.marketplace-inventory-card',
  )
  && css.includes(
    'align-self: start;',
  ),
  'No-photo listing cards no longer stretch.',
);

check(
  css.includes(
    '.pos-page-actions',
  )
  && css.includes(
    'minmax(88px, 1fr)',
  ),
  'POS header actions stay compact on mobile.',
);

if (failures.length) {
  throw new Error(
    `Marketplace mobile v1.14.10 verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'MARKETPLACE MOBILE v1.14.10 VERIFIER: PASS',
);