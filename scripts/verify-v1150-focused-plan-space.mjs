import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\\r\\n?/g, '\\n');

const spaces = read(
  'src/features/spaces/SpacesPage.tsx',
);
const details = read(
  'src/features/spaces/SpaceDetailsPage.tsx',
);
const css = read(
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

check(
  spaces.includes(
    "import { createGoal }"
  )
  && spaces.includes(
    'planTargetAmount'
  )
  && spaces.includes(
    'Target amount (BND)'
  )
  && spaces.includes(
    'Target date (optional)'
  ),
  'Plan creation captures its target and date.',
);

check(
  spaces.includes(
    'await createGoal({'
  )
  && spaces.includes(
    'targetMinor:'
  )
  && spaces.includes(
    'createdSpaceId'
  ),
  'Plan creation creates the first target automatically.',
);

check(
  details.includes(
    'data-focused-plan-home'
  )
  && details.includes(
    'Target & contributions'
  )
  && details.includes(
    'Remaining'
  )
  && details.includes(
    'Progress'
  ),
  'Plan home is target-focused.',
);

check(
  details.includes(
    "{space.type !== 'goal'\n      && space.type !== 'trip'\n      && (\n      <SpaceActionHub"
  ),
  'Plan bypasses the generic shared Space launcher.',
);

check(
  details.includes(
    "{ id: 'overview', label: 'Plan' }"
  )
  && details.includes(
    "{ id: 'activity', label: 'Activity' }"
  )
  && details.includes(
    "{ id: 'settings', label: 'Settings' }"
  )
  && !details.includes(
    "{ id: 'overview', label: 'Plan' },\n        { id: 'members', label: 'Members' }"
  ),
  'Plan tabs are Plan / Activity / Settings only.',
);

check(
  details.includes(
    "nextSpace.type !== 'goal'"
  )
  && details.includes(
    'shouldLoadFocusedPlanData'
  )
  && details.includes(
    "requestedSection === 'calendar'"
  )
  && details.includes(
    "space.type === 'goal' ? ("
  ),
  'Plan loads only target data and avoids unrelated shared financial modules.',
);

check(
  details.includes(
    "section === 'calendar'"
  )
  && details.includes(
    'Only dates belonging to this Plan are shown.'
  ),
  'Plan calendar only shows Plan target dates.',
);

check(
  details.includes(
    'householdInlineSection\n      || marketplaceInlineSection'
  ),
  'Legacy Marketplace inline structural anchor is preserved.',
);

check(
  css.includes(
    'BAJETBN V115 FOCUSED PLAN SPACE'
  ),
  'Focused Plan styling is present.',
);

console.log('');
console.log(
  'BAJETBN v1.15.0 FOCUSED PLAN SPACE: PASS',
);
