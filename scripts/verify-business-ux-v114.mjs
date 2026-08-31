import fs from 'node:fs';
import path from 'node:path';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const app =
  read('src/app/App.tsx');

const shell =
  read('src/layouts/AppShell.tsx');

const spaces =
  read('src/features/spaces/SpacesPage.tsx');

const onboarding =
  read('src/features/onboarding/OnboardingPage.tsx');

const business =
  read('src/features/business/BusinessAdvancedPage.tsx');

const wizard =
  read('src/features/business/BusinessWizardPage.tsx');

const pkg =
  JSON.parse(
    read('package.json'),
  );

const release =
  JSON.parse(
    read('release.json'),
  );

const scope =
  JSON.parse(
    read('scope/v1.14-business-ux.json'),
  );

const failures = [];

function check(
  condition,
  message,
) {
  if (condition) {
    console.log(
      'PASS:',
      message,
    );
    return;
  }

  failures.push(message);
  console.error(
    'FAIL:',
    message,
  );
}

function walk(directory) {
  const output = [];

  for (
    const entry of
      fs.readdirSync(
        directory,
        {
          withFileTypes: true,
        },
      )
  ) {
    const full =
      path.join(
        directory,
        entry.name,
      );

    if (entry.isDirectory()) {
      output.push(
        ...walk(full),
      );
      continue;
    }

    if (
      full.endsWith('.ts')
      || full.endsWith('.tsx')
    ) {
      output.push(full);
    }
  }

  return output;
}

check(
  /^1\.14\.\d+$/.test(
    pkg.version,
  )
    && release.version === pkg.version,
  'v1.14 package and release versions match.',
);

check(
  app.includes(
    'BusinessWizardPage',
  )
    && app.includes(
      'path="spaces/:spaceId/business/setup"',
    ),
  'Business Wizard route exists.',
);

check(
  wizard.includes(
    'Step {step} of 4',
  )
    && wizard.includes(
      'saveBusinessProfile',
    )
    && wizard.includes(
      'Type of Business',
    )
    && wizard.includes(
      'Business Accounts',
    )
    && wizard.includes(
      'POS & Inventory',
    )
    && wizard.includes(
      'Only the Business owner can run the Business Setup Wizard.',
    ),
  'Business Wizard covers guided profile and workflow setup.',
);

check(
  spaces.includes(
    "values.type === 'sme'",
  )
    && spaces.includes(
      '/business/setup',
    ),
  'New Business Spaces automatically enter Business Setup.',
);

check(
  business.includes(
    'Business Setup',
  )
    && business.includes(
      '/business/setup',
    ),
  'Business Admin can reopen Business Setup.',
);

const allSource =
  walk('src')
    .map(read)
    .join('\n');

check(
  !/\bSME\b/.test(
    allSource,
  ),
  'User-facing source no longer contains standalone SME wording.',
);

check(
  !onboarding.includes(
    'Business / SME',
  )
    && onboarding.includes(
      "title: 'Business'",
    ),
  'Onboarding uses Business terminology.',
);

check(
  spaces.includes(
    "sme: 'Business'",
  ),
  'Spaces label the internal sme type as Business.',
);

const mobileHeaderStart =
  shell.indexOf(
    '<header className="mobile-header">',
  );

const mobileHeaderEnd =
  shell.indexOf(
    '</header>',
    mobileHeaderStart,
  );

const mobileHeader =
  mobileHeaderStart >= 0
    && mobileHeaderEnd > mobileHeaderStart
    ? shell.slice(
        mobileHeaderStart,
        mobileHeaderEnd,
      )
    : '';

check(
  mobileHeader.includes(
    "navigate('/notifications')",
  )
    && mobileHeader.includes(
      '<NotificationBellIcon />',
    )
    && mobileHeader.includes(
      'unreadNotifications > 0',
    ),
  'Alerts is in the mobile header with unread count.',
);

check(
  !mobileHeader.includes(
    'environment-badge',
  ),
  'Mobile header does not expose Staging/Production environment wording.',
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

const tokens = [
  'Business',
  '<small>Home</small>',
  'mobile-bottom-add',
  '<small>Space</small>',
  '<small>More</small>',
];

let lastIndex = -1;
let correctOrder = true;

for (const token of tokens) {
  const index =
    nav.indexOf(token);

  if (
    index < 0
    || index <= lastIndex
  ) {
    correctOrder = false;
    break;
  }

  lastIndex = index;
}

check(
  correctOrder,
  'Mobile navigation order is Business | Home | + | Space | More.',
);

check(
  nav.includes(
    'to="/spaces"',
  )
    && !nav.includes(
      '<small>Alerts</small>',
    ),
  'Space replaces Alerts in mobile bottom slot four.',
);

const stagingAcceptance =
  scope.items.find(
    (item) =>
      item.id ===
        'release.v114_staging_acceptance',
  );

check(
  scope.items.every(
    (item) =>
      item.status === 'complete',
  )
    && stagingAcceptance?.acceptedCandidate ===
      '34ea41b55c0d849a7793452914b86df3f6d79b02'
    && stagingAcceptance?.acceptedAt ===
      '2026-08-31'
    && stagingAcceptance?.ciRunId ===
      33322670991
    && stagingAcceptance?.ownerAcceptance ===
      'pass',
  'v1.14 staging acceptance is recorded against the verified runtime candidate.',
);

check(
  /LOCKED/i.test(
    scope.policy?.production
      || '',
  ),
  'Production remains explicitly locked.',
);

if (failures.length) {
  console.error('');

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  throw new Error(
    `BajetBN v1.14 Business UX verification failed: ${failures.length} check(s).`,
  );
}

console.log('');
console.log(
  'BAJETBN v1.14 BUSINESS UX VERIFICATION PASS',
);
console.log(
  'Business Wizard     : COMPLETE',
);
console.log(
  'Business terminology: COMPLETE',
);
console.log(
  'Mobile layout       : Business | Home | + | Space | More',
);
console.log(
  'Mobile Alerts       : HEADER',
);
console.log(
  'Production          : LOCKED',
);