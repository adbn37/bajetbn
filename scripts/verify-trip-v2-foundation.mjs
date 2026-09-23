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
  'Trip workbook must lazy-load TripPlanningPanel.',
);

need(
  details.includes("import('./TripCommandCentre')")
    && details.includes(
      'default: module.TripCommandCentre',
    ),
  'Trip workbook Overview must lazy-load TripCommandCentre.',
);

need(
  details.includes(
    'className="trip-workbook-shell-v115"',
  )
    && details.includes(
      'className="trip-workbook-sheet-body-v115"',
    ),
  'Trip must remain inside the v1.15 workbook shell.',
);

need(
  details.includes(
    '<TripCommandCentre',
  )
    && details.includes(
      '<TripPlanningPanel',
    ),
  'Trip workbook must render Overview and planning worksheets.',
);

for (const sheet of [
  "'overview'",
  "'itinerary'",
  "'tasks'",
  "'bookings'",
]) {
  need(
    details.includes(sheet),
    `Trip workbook sheet missing: ${sheet}`,
  );
}

need(
  details.includes(
    'space={space}',
  )
    && details.includes(
      'members={members}',
    )
    && details.includes(
      'currentMember={',
    ),
  'Trip worksheets must receive the current Space context.',
);

for (const text of [
  'Trip Plan',
  'Edit the Trip like a spreadsheet.',
  'placeholder="Add a stop…"',
  'placeholder="Add a task…"',
  'placeholder="Add booking…"',
  'No itinerary yet.',
  'No tasks yet.',
  'No bookings yet.',
  'Record actual payment in Trip Expenses.',
]) {
  need(
    panel.includes(text),
    `Missing current Trip planning UI text: ${text}`,
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
    '.trip-workbook-shell-v115',
  )
    && css.includes(
      '.trip-workbook-sheet-body-v115',
    )
    && css.includes(
      '.trip-sheet-table',
    ),
  'Current Trip workbook/spreadsheet CSS is missing.',
);

console.log(
  `Trip v2 foundation / v1.15 workbook checks passed (${checks.length} checks).`,
);
