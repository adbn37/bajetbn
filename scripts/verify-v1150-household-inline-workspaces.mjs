import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(
    file,
    'utf8',
  ).replace(/\r\n?/g, '\n');

const page =
  read(
    'src/features/spaces/SpaceDetailsPage.tsx',
  );

const hub =
  read(
    'src/features/spaces/SpaceActionHub.tsx',
  );

const work =
  read(
    'src/features/spaces/SpaceWorkPanel.tsx',
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

const householdStart =
  hub.indexOf(
    "{space.type === 'household' && <>"
  );

const householdEnd =
  hub.indexOf(
    "{space.type === 'personal' && <>",
    householdStart,
  );

const household =
  hub.slice(
    householdStart,
    householdEnd,
  );

check(
  page.includes(
    "householdInlineSection === 'todo'"
  )
  && page.includes(
    "householdInlineSection === 'shopping'"
  )
  && page.includes(
    'showViewSwitcher={false}'
  ),
  'Household To-Do and To-Buy open as dedicated inline workspaces.',
);

check(
  work.includes(
    'showViewSwitcher = true'
  )
  && work.includes(
    'showViewSwitcher?: boolean;'
  )
  && work.includes(
    '{showViewSwitcher && ('
  ),
  'SpaceWorkPanel has an explicit optional view switcher.',
);

check(
  !css.includes(
`.household-inline-section-v1147
.space-work-panel
> .button-row:first-child`
  ),
  'Household no longer depends on CSS to hide the duplicate switcher.',
);

check(
  household.includes(
    'label="To-Do"'
  )
  && household.includes(
    'label="To-Buy"'
  )
  && !household.includes(
    'label="Shopping"'
  ),
  'Household shortcut wording consistently uses To-Do and To-Buy.',
);

check(
  household.includes(
    'label="Shared Expenses"'
  )
  && household.includes(
    'label="Settle Up"'
  ),
  'Household shared-money shortcut labels are explicit.',
);

check(
  household.includes(
    "to={`/spaces/${space.id}?section=bills`}"
  )
  && household.includes(
    'label="Bills"'
  )
  && page.includes(
    "householdInlineSection === 'bills'"
  )
  && page.includes(
    '<EmbeddedCommitmentsPage'
  ),
  'Household Bills opens the inline Bills/Instalments workspace.',
);

check(
  hub.includes(
`{!['sme', 'trip', 'household', 'personal'].includes(space.type) && <>`
  )
  && hub.includes(
    'label="Settle"'
  ),
  'Generic non-Household Settle navigation remains unchanged.',
);

for (const section of [
  'fund',
  'bills',
  'shared-expenses',
  'todo',
  'shopping',
  'chat',
  'budgets',
  'members',
  'activity',
  'settings',
]) {
  check(
    page.includes(
      `'${section}'`
    ),
    `Household inline section ${section} remains available.`,
  );
}

check(
  css.includes(
    'BAJETBN V115 HOUSEHOLD INLINE WORKSPACE CLEANUP'
  ),
  'Household inline cleanup styling is installed.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 HOUSEHOLD INLINE WORKSPACE CLEANUP: PASS',
);
