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
      'Global More remains in the bottom navigation.',
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
    'data-space-launcher="sme"',
  )
    && hub.includes(
      'data-business-industry={businessIndustry}',
    )
    && hub.includes(
      'label="Business Overview"',
    )
    && hub.includes(
      "businessIndustry === 'retail'",
    )
    && hub.includes(
      "businessIndustry === 'marketplace'",
    )
    && hub.includes(
      'salesFocusedBusiness',
    )
    && hub.includes(
      'to={`/spaces/${space.id}/pos`}',
    )
    && hub.includes(
      'businessWorkflowLabel',
    )
    && hub.includes(
      "'Service Operations'",
    )
    && hub.includes(
      "'Rental Operations'",
    )
    && hub.includes(
      "'Delivery Operations'",
    )
    && hub.includes(
      'label="Business Accounts"',
    )
    && hub.includes(
      'businessAdminLabel',
    )
    && hub.includes(
      "'Renters & Admin'",
    )
    && hub.includes(
      "'Customers & Admin'",
    )
    && hub.includes(
      'label="Tasks"',
    )
    && hub.includes(
      'label="Purchase List"',
    )
    && hub.includes(
      'to={`/spaces/${space.id}?tab=activity`}',
    )
    && hub.includes(
      'label="More"',
    )
    && hub.includes(
      'label="Staff Guide"',
    )
    && hub.includes(
      'to={`/spaces/${space.id}?section=accounts`}',
    )
    && hub.includes(
      'to={`/spaces/${space.id}/business`}',
    )
    && hub.includes(
      'to={`/spaces/${space.id}/business/industry`}',
    )
    && !hub.includes(
      'to="/accounts"',
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
    "type MarketplaceTab = 'register' | 'sellers' | 'listings' | 'customers' | 'bookings' | 'sales' | 'reports' | 'balance';",
  )
    && marketplacePos.includes(
      'Shared register',
    )
    && marketplacePos.includes(
      'Seller money waiting',
    )
    && marketplacePos.includes(
      'My balance',
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
    '/spaces?welcome=1',
  )
    && spaces.includes(
      'Your Personal Space is ready',
    ),
  'Phase 9: Space discovery complete.',
);

check(
  help.includes(
    'markContextualHelpSeen',
  )
    && help.includes(
      'CONTEXTUAL_HELP_REPLAY_EVENT',
    )
    && help.includes(
      'This tip normally appears only once.',
    ),
  'One-time contextual help with replay remains present.',
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
  'Business',
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
  navValid,
  'Business | Home | + | Space | More remains locked.',
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
