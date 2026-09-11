import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\r\n?/g, '\n');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const page =
  read('src/features/sme-pos/SmePosPage.tsx');

const marketplace =
  read(
    'src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx',
  );

const collaboration =
  read(
    'src/features/collaboration/CollaborationPage.tsx',
  );

const failures = [];

function check(condition, label) {
  if (condition) {
    console.log('PASS:', label);
  } else {
    console.error('FAIL:', label);
    failures.push(label);
  }
}

const marketplaceStart =
  hub.indexOf(
    "{space.type === 'sme' && businessIndustry === 'marketplace'",
  );

const retailStart =
  hub.indexOf(
    "{space.type === 'sme' && businessIndustry === 'retail'",
  );

const nav =
  marketplaceStart >= 0
    && retailStart > marketplaceStart
      ? hub.slice(
          marketplaceStart,
          retailStart,
        )
      : '';

check(
  nav.includes('label="POS"')
  && !nav.includes('label="POS"\n                primary')
  && nav.includes('label="Purchase List"'),
  'Marketplace shortcuts are neutral and Purchase List is named accurately.',
);

const moreStart =
  hub.indexOf(
    "{space.type === 'sme' && <>",
  );

check(
  hub.includes(
    'label="Business Setup"',
  )
  && hub.includes(
    "{businessIndustry === 'retail' && (",
  ),
  'Marketplace More uses Business Setup and no duplicate Purchase List.',
);

check(
  details.indexOf(
    '<SmeOperationalAttentionPanel',
  )
  < details.indexOf(
    '<SpaceHomeOverview',
  ),
  'Marketplace operational overview appears before generic Space money summary.',
);

check(
  page.includes('>POS Settings</Link>'),
  'POS Settings is clearly distinguished from Business Setup.',
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
  'Marketplace management pages have management-specific headings.',
);

check(
  marketplace.includes(
    'aria-label="Marketplace management"',
  )
  && marketplace.includes(
    'managementTabOrder',
  )
  && !marketplace.includes(
    'className="marketplace-pos-more"',
  ),
  'Marketplace management navigation replaces the one-item More dropdown.',
);

check(
  marketplace.includes(
    '/pos/archived',
  )
  && marketplace.includes(
    'Archived',
  )
  && !marketplace.includes(
    'className="marketplace-pos-more"',
  ),
  'Archived is exposed directly.',
);

check(
  marketplace.includes(
    'No shop commission has been recorded for existing seller sales.',
  ),
  'Zero recorded commission warning exists.',
);

check(
  marketplace.includes(
    'payout record(s) made during the selected period',
  )
  && marketplace.includes(
    'not limited to the selected period',
  ),
  'Marketplace report period wording is clear.',
);

check(
  collaboration.includes(
    'Space: {roleLabel[member.role] || member.role}',
  )
  && collaboration.includes(
    'POS: {smePosRoleLabel',
  )
  && collaboration.includes(
    'Space access:'
  )
  && collaboration.includes(
    'POS access:'
  ),
  'Business Members clearly separates Space and POS roles.',
);

if (failures.length) {
  throw new Error(
    `Marketplace IA v1.14.9 verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'MARKETPLACE IA v1.14.9 VERIFIER: PASS',
);