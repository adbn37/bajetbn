import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const panel =
  read('src/features/spaces/TripPlanningPanel.tsx');

const fund =
  read('src/features/spaces/SpaceFundPanel.tsx');

const css =
  read('src/styles/global.css');

const checks = [];

function need(condition, label) {
  checks.push(label);

  if (!condition) {
    throw new Error(label);
  }
}

need(
  details.includes("import('./TripPlanningPanel')")
    && details.includes(
      'default: module.TripPlanningPanel',
    ),
  'SpaceDetailsPage must lazy-load TripPlanningPanel directly.',
);

need(
  !details.includes(
    "import('./TripCommandCentre')",
  ),
  'SpaceDetailsPage must not restore the old TripCommandCentre wrapper.',
);

need(
  details.includes(
    "detailedOverviewRequested",
  )
    && details.includes(
      "activeTab === 'overview'",
    )
    && details.includes(
      "space.type === 'trip'",
    ),
  'Direct Trip Plan must stay scoped to Trip overview.',
);

need(
  details.includes(
    'className="panel trip-plan-direct-v115"',
  )
    && details.includes(
      'data-trip-plan-direct',
    ),
  'Direct Trip Plan full-width section is missing.',
);

need(
  details.includes(
    '<TripPlanningPanel',
  )
    && details.includes(
      'space={space}',
    )
    && details.includes(
      'members={members}',
    )
    && details.includes(
      'currentMember={currentMember}',
    ),
  'Direct Trip Plan must receive the current Space context.',
);

for (const text of [
  'Trip Plan',
  'Add itinerary item',
  'Add Task',
  'Add Booking',
  'No itinerary yet.',
  'No tasks yet.',
  'No bookings yet.',
]) {
  need(
    panel.includes(text),
    `Missing Trip planning UI text: ${text}`,
  );
}

need(
  fund.includes(
    "targetLabel: 'Trip Fund target'",
  ),
  'Trip Fund target terminology is missing.',
);

need(
  !fund.includes(
    "targetLabel: 'Trip budget'",
  ),
  'Trip Fund is still incorrectly labelled as Trip budget.',
);

need(
  fund.includes(
    "targetHelp: 'How much the group plans to collect'",
  ),
  'Trip Fund target guidance is missing.',
);

need(
  css.includes(
    '.trip-plan-direct-v115',
  ),
  'Direct full-width Trip Plan CSS is missing.',
);

console.log(
  `Trip v2 foundation / v1.15 direct-plan checks passed (${checks.length} checks).`,
);
