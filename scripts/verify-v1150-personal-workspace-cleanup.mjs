import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(
    path,
    'utf8',
  ).replace(/\r\n?/g, '\n');

const details =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const hub =
  read(
    'src/features/spaces/SpaceActionHub.tsx',
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

const personalStart =
  hub.indexOf(
    "{space.type === 'personal' && <>"
  );

const personalEnd =
  hub.indexOf(
    "{!['sme', 'trip', 'household', 'personal'].includes(space.type) && <>",
    personalStart,
  );

const personal =
  personalStart >= 0
  && personalEnd > personalStart
    ? hub.slice(
        personalStart,
        personalEnd,
      )
    : '';

check(
  Boolean(personal),
  'Simplified Personal navigation block exists.',
);

const labels = [
  'Overview',
  'Accounts',
  'Money Activity',
  'Budget',
  'Goals',
  'Bills',
  'Instalments',
  'Reports',
  'Calendar',
  'Settings',
];

let previous = -1;

for (const label of labels) {
  const position =
    personal.indexOf(
      `label="${label}"`
    );

  check(
    position > previous,
    `Personal navigation includes ${label} in order.`,
  );

  previous = position;
}

check(
  !personal.includes(
    'label="Home"'
  )
  && !personal.includes(
    'label="Money"'
  ),
  'Old Personal Home/Money wording is removed from simplified navigation.',
);

for (const route of [
  '?section=accounts',
  '?section=money',
  '?section=budgets',
  '?section=goals',
  '?section=bills',
  '?section=instalments',
  '?section=reports',
  '?section=calendar',
  '?tab=settings',
]) {
  check(
    personal.includes(route),
    `Personal navigation route ${route} remains direct.`,
  );
}

check(
  details.includes(
`        {space.type !== 'personal' && (
          <button
            type="button"
            className="button secondary compact"
            onClick={closeOverviewSection}
          >
            Home
          </button>
        )}`
  ),
  'Duplicate inline Home button is suppressed for Personal only.',
);

check(
  details.includes(
`        {space.type !== 'personal' && (
          <div className="space-scoped-context">`
  ),
  'Redundant Space-scoped context banner is suppressed for Personal only.',
);

check(
  details.includes(
    "space.type === 'personal'\n          && section === 'accounts'"
  )
  && details.includes(
    '<EmbeddedAccountsPage'
  )
  && details.includes(
    'spaceIdOverride={space.id}'
  ),
  'Personal Accounts remains the embedded scoped module.',
);

check(
  details.includes(
    "section === 'money'"
  )
  && details.includes(
    "section === 'budgets'"
  )
  && details.includes(
    "section === 'goals'"
  )
  && details.includes(
    "section === 'bills'"
  )
  && details.includes(
    "section === 'instalments'"
  )
  && details.includes(
    "section === 'reports'"
  )
  && details.includes(
    "section === 'calendar'"
  ),
  'All Personal workspace destinations remain available.',
);

check(
  details.includes(
    'typeOverride="bill"'
  )
  && details.includes(
    'typeOverride="instalment"'
  ),
  'Bills and Instalments remain separate functional workspaces.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 PERSONAL WORKSPACE CLEANUP: PASS',
);
