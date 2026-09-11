import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8');

const hub =
  read('src/features/spaces/SpaceActionHub.tsx');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const shell =
  read('src/layouts/AppShell.tsx');

const standardPos =
  read('src/features/sme-pos/StandardPosWorkspace.tsx');

const marketplacePos =
  read('src/features/sme-pos/MarketplaceConsignmentPosWorkspace.tsx');

const onboarding =
  read('src/features/onboarding/OnboardingPage.tsx');

const auth =
  read('src/layouts/AuthLayout.tsx');

const spaces =
  read('src/features/spaces/SpacesPage.tsx');

const help =
  read('src/components/ContextualHelp.tsx');

const more =
  read('src/pages/MorePage.tsx');

const failures = [];

function check(condition, message) {
  if (condition) {
    console.log('PASS:', message);
    return;
  }

  failures.push(message);
  console.error('FAIL:', message);
}

check(
  hub.includes(
    'data-space-launcher="personal"',
  )
    && hub.includes(
      'data-personal-home-v111',
    ),
  'Phase 4: Personal Space launcher complete.',
);

check(
  hub.includes(
    'data-space-more-v111',
  )
    && hub.includes(
      'More for this Space.',
    ),
  'Phase 4: Space More is separate from Global More.',
);

check(
  hub.includes(
    'data-space-launcher="household"',
  )
    && hub.includes(
      'label="Household Fund"',
    )
    && hub.includes(
      'label="To-Do"',
    )
    && hub.includes(
      'label="To-Buy"',
    ),
  'Phase 5: Household compact home complete.',
);

check(
  hub.includes(
    'data-space-launcher="trip"',
  )
    && hub.includes(
      'label="Trip Plan"',
    )
    && hub.includes(
      'label="Trip Fund"',
    )
    && hub.includes(
      'label="Trip Expenses"',
    )
    && hub.includes(
      'label="Settle Up"',
    ),
  'Phase 5: Trip compact home complete.',
);

check(
  hub.includes(
    'data-simplified-space-navigation',
  )
    && hub.includes(
      "businessIndustry === 'retail'",
    )
    && hub.includes(
      "businessIndustry === 'marketplace'",
    )
    && hub.includes(
      "businessIndustry === 'service'",
    )
    && hub.includes(
      "businessIndustry === 'rental'",
    )
    && hub.includes(
      "businessIndustry === 'transport_delivery'",
    )
    && hub.includes(
      'label="Money"',
    )
    && hub.includes(
      'label="More"',
    )
    && hub.includes(
      'to={`/spaces/${space.id}/pos`}',
    ),
  'Phase 6: industry-aware Business Space home complete.',
);

check(
  details.includes(
    '<SmeOperationsCommandCentre',
  ),
  'General SME operations workspace remains canonical.',
);

check(
  standardPos.includes(
    "type WorkspaceTab = 'products' | 'customers' | 'register' | 'bookings' | 'sales';",
  )
    && standardPos.includes(
      'Open Register',
    )
    && standardPos.includes(
      'Complete sale',
    )
    && standardPos.includes(
      'canViewReports',
    ),
  'Phase 7: Standard POS retained.',
);

check(
  marketplacePos.includes(
    "export type MarketplaceManagementTab =",
  )
    && marketplacePos.includes(
      'Shared register',
    )
    && marketplacePos.includes(
      'Seller payable',
    )
    && marketplacePos.includes(
      'My balance',
    )
    && marketplacePos.includes(
      "payouts: 'Payouts'",
    )
    && marketplacePos.includes(
      'Pending seller payouts',
    )
    && marketplacePos.includes(
      'Payout history',
    )
    && !marketplacePos.includes(
      "bookings: 'Bookings'",
    ),
  'Phase 8: Marketplace Consignment POS retained.',
);

check(
  auth.includes(
    '{isLogin && <ThemeChooser compact />}',
  )
    && !onboarding.includes(
      'ThemeChooser',
    ),
  'Phase 9: Theme chooser is login-only.',
);

check(
  onboarding.includes(
    '/?welcome=1',
  )
    && !onboarding.includes(
      '/spaces?welcome=1&setup=',
    )
    && !spaces.includes(
      'Personal money does not need a Space.',
    )
    && !spaces.includes(
      'guided-onboarding-next-v113',
    ),
  'Personal budgeting is primary and Spaces stay optional without permanent guidance banners.',
);

check(
  help.includes(
    'markContextualHelpSeen',
  )
    && !shell.includes(
      '<ContextualHelp',
    )
    && !more.includes(
      'Replay tips',
    ),
  'Contextual help capability remains available but repeating runtime tips are disabled.',
);

const navStart =
  shell.indexOf(
    '<nav className="mobile-bottom-nav"',
  );

const navEnd =
  shell.indexOf(
    '</nav>',
    navStart,
  );

const nav =
  navStart >= 0
    && navEnd > navStart
    ? shell.slice(
        navStart,
        navEnd,
      )
    : '';

const navTokens = [
  '<small>Business</small>',
  '<small>Home</small>',
  'mobile-bottom-add',
  '<small>Space</small>',
  '<small>More</small>',
];

let previous = -1;
let navValid = true;

for (const token of navTokens) {
  const index =
    nav.indexOf(token);

  if (
    index < 0
    || index <= previous
  ) {
    navValid = false;
    break;
  }

  previous = index;
}

check(
  navValid
    && !nav.includes(
      '<small>Money</small>',
    )
    && nav.includes(
      'openBusinessShortcut',
    ),
  'Business | Home | + | Space | More is the mobile navigation.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  throw new Error(
    `Final Space-first verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  '=================================================',
);

console.log(
  ' BAJETBN v1.12.0 SPACE-FIRST PROGRAM: PASS',
);

console.log(
  '=================================================',
);
