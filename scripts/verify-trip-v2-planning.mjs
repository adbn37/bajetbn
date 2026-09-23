import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const models =
  read('src/types/models.ts');

const repo =
  read('src/repositories/tripPlanningRepository.ts');

const panel =
  read('src/features/spaces/TripPlanningPanel.tsx');

const details =
  read('src/features/spaces/SpaceDetailsPage.tsx');

const rules =
  read('firestore.rules');

const functions =
  read('functions/src/index.ts');

const css =
  read('src/styles/global.css');

const checks = [];

function need(condition, label) {
  checks.push(label);

  if (!condition) {
    throw new Error(label);
  }
}

for (const token of [
  'export interface TripItineraryItem',
  'export interface TripTask',
  'export interface TripBooking',
  "export type TripTaskStatus = 'open' | 'completed'",
]) {
  need(
    models.includes(token),
    `Missing Trip planning model: ${token}`,
  );
}

for (const token of [
  'listTripItineraryItems',
  'listTripTasks',
  'listTripBookings',
  'saveTripItineraryItem',
  'saveTripTask',
  'setTripTaskStatus',
  'saveTripBooking',
]) {
  need(
    repo.includes(token),
    `Missing Trip planning repository contract: ${token}`,
  );
}

need(
  !repo.includes(
    'smePosReservations',
  ),
  'Trip planning must not reuse SME POS reservations.',
);

need(
  panel.includes('data-trip-spreadsheet')
    && panel.includes(
      'className="trip-sheet-table trip-sheet-itinerary"',
    )
    && panel.includes(
      'className="trip-sheet-table trip-sheet-tasks"',
    )
    && panel.includes(
      'className="trip-sheet-table trip-sheet-bookings"',
    ),
  'Trip Plan must render spreadsheet tables for Itinerary, Tasks and Bookings.',
);

need(
  panel.includes('Edit the Trip like a spreadsheet.')
    && panel.includes('placeholder="Add a stop…"')
    && panel.includes('placeholder="Add a task…"')
    && panel.includes('placeholder="Add booking…"'),
  'Trip spreadsheet rows must expose the current inline-entry placeholders.',
);

need(
  panel.includes('itemId,')
    && panel.includes('taskId,')
    && panel.includes('bookingId,')
    && repo.includes('itemId?: string;')
    && repo.includes('taskId?: string;')
    && repo.includes('bookingId?: string;'),
  'Existing Trip rows must remain editable through current save APIs.',
);

need(
  /planningView\s*===\s*'itinerary'/m.test(panel)
    && /planningView\s*===\s*'tasks'/m.test(panel)
    && /planningView\s*===\s*'bookings'/m.test(panel),
  'Trip Plan must keep the three intended worksheet views.',
);

need(
  panel.includes(
    'Record actual payment in Trip Expenses.',
  ),
  'Bookings must remain planning-only and point actual payment to Trip Expenses.',
);

for (const text of [
  'No itinerary yet.',
  'No tasks yet.',
  'No bookings yet.',
]) {
  need(
    panel.includes(text),
    `Missing current Trip empty-state text: ${text}`,
  );
}

need(
  /\[\s*'owner',\s*'admin',\s*'contributor',?\s*\]\.includes\(\s*currentMember\?\.role\s*\|\|\s*''\s*,?\s*\)/m.test(
    panel,
  ),
  'Trip planning UI must reuse existing Space roles.',
);

need(
  /canPlan\s*\|\|\s*task\.assigneeUid\s*===\s*currentMember\?\.uid/m.test(
    panel,
  ),
  'Assigned members must be able to update their own Task status.',
);

need(
  details.includes(
    "import('./TripPlanningPanel')",
  )
    && details.includes(
      'default: module.TripPlanningPanel',
    ),
  'SpaceDetailsPage must lazy-load TripPlanningPanel.',
);

need(
  details.includes(
    "import('./TripCommandCentre')",
  )
    && details.includes(
      'default: module.TripCommandCentre',
    ),
  'Current Trip workbook Overview must lazy-load TripCommandCentre.',
);

need(
  details.includes(
    '<TripPlanningPanel',
  )
    && details.includes(
      '<TripCommandCentre',
    )
    && details.includes(
      'className="trip-workbook-sheet-body-v115"',
    ),
  'Trip planning and Overview must render inside the current Trip workbook.',
);

need(
  details.includes(
    'currentMember={',
  ),
  'SpaceDetailsPage must pass the current Space member.',
);

for (const collection of [
  'tripItineraryItems',
  'tripTasks',
  'tripBookings',
]) {
  need(
    rules.includes(
      `match /${collection}/`,
    ),
    `Missing Firestore rule for ${collection}.`,
  );
}

need(
  rules.includes(
    'allow create, update, delete: if false;',
  ),
  'Trip planning writes must remain server controlled.',
);

for (const callable of [
  'export const saveTripItineraryItem',
  'export const archiveTripItineraryItem',
  'export const saveTripTask',
  'export const setTripTaskStatus',
  'export const archiveTripTask',
  'export const saveTripBooking',
  'export const archiveTripBooking',
]) {
  need(
    functions.includes(callable),
    `Missing Trip planning callable: ${callable}`,
  );
}

need(
  /\[\s*'owner',\s*'admin',\s*'contributor',?\s*\]\.includes\(/m.test(
    functions,
  ),
  'Backend Trip planning must reuse Space roles.',
);

need(
  /type:\s*'trip_task_assigned'/m.test(
    functions,
  ),
  'Task assignment notification is missing.',
);

need(
  /'trip_task_completed'/m.test(
    functions,
  )
    && /'trip_task_reopened'/m.test(
      functions,
    ),
  'Trip Task completion activity is missing.',
);

need(
  /queryHasDocuments\(\s*db\.collection\('tripTasks'\)\.where\('spaceId',\s*'==',\s*spaceId\)\s*\)/m.test(
    functions,
  ),
  'Trip planning history must block destructive Space deletion.',
);

need(
  /'tripItineraryItems',\s*'tripTasks',\s*'tripBookings'/m.test(
    functions,
  ),
  'Owned Space deletion must include Trip planning collections.',
);

need(
  /collectionName:\s*'tripTasks',\s*field:\s*'assigneeUid'/m.test(
    functions,
  ),
  'Trip Task account-deletion anonymization is missing.',
);

need(
  css.includes(
    '/* Trip v2 Slice 2 - planning */',
  )
    && css.includes(
      '/* v1.15.0 Trip spreadsheet planning */',
    )
    && css.includes(
      '.trip-sheet-scroll',
    )
    && css.includes(
      'overflow-x: auto;',
    ),
  'Trip planning spreadsheet styling is missing.',
);

need(
  css.includes(
    '.trip-workbook-shell-v115',
  )
    && css.includes(
      '.trip-workbook-sheet-body-v115',
    ),
  'Current Trip workbook layout CSS is missing.',
);

need(
  !panel.includes(
    'className="trip-planning-card"',
  ),
  'Trip Plan must not regress to card-stack planning records.',
);

need(
  !panel.includes(
    'window.confirm(',
  )
    && !panel.includes(
      'window.alert(',
    ),
  'Browser-native confirmation must not remain in Trip planning.',
);

need(
  panel.includes(
    'archiveRequest',
  )
    && panel.includes(
      'confirmArchive',
    ),
  'Trip planning must use the in-app archive confirmation flow.',
);

console.log(
  `Trip v2 Slice 2 / v1.15 workbook planning checks passed (${checks.length} checks).`,
);
