import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

const models = read('src/types/models.ts');
const repo = read('src/repositories/tripPlanningRepository.ts');
const panel = read('src/features/spaces/TripPlanningPanel.tsx');
const command = read('src/features/spaces/TripCommandCentre.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const rules = read('firestore.rules');
const functions = read('functions/src/index.ts');
const css = read('src/styles/global.css');

const checks = [];

function need(condition, label) {
  checks.push(label);
  if (!condition) throw new Error(label);
}

for (const token of [
  'export interface TripItineraryItem',
  'export interface TripTask',
  'export interface TripBooking',
  "export type TripTaskStatus = 'open' | 'completed'",
]) {
  need(models.includes(token), `Missing Trip planning model: ${token}`);
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
  need(repo.includes(token), `Missing Trip planning repository contract: ${token}`);
}

need(
  !repo.includes('smePosReservations'),
  'Trip planning must not reuse SME POS reservations.',
);

for (const text of [
  'Trip Plan',
  'Add itinerary item',
  'Add Task',
  'Add Booking',
  'Bookings are for planning.',
  'No itinerary yet.',
  'No tasks yet.',
  'No bookings yet.',
]) {
  need(panel.includes(text), `Missing Trip planning UI text: ${text}`);
}

need(
  panel.includes("['owner', 'admin', 'contributor']"),
  'Trip planning UI must reuse existing Space roles.',
);

need(
  panel.includes("task.assigneeUid === currentMember?.uid"),
  'Assigned members must be able to update their own Task status.',
);

need(
  command.includes("import { TripPlanningPanel } from './TripPlanningPanel';"),
  'Trip command centre must import TripPlanningPanel.',
);

need(
  command.includes('<TripPlanningPanel'),
  'Trip planning must live inside the Trip Space.',
);

need(
  details.includes('currentMember={currentMember}'),
  'SpaceDetailsPage must pass the current Space member.',
);

for (const collection of [
  'tripItineraryItems',
  'tripTasks',
  'tripBookings',
]) {
  need(
    rules.includes(`match /${collection}/`),
    `Missing Firestore rule for ${collection}.`,
  );
}

need(
  rules.includes('allow create, update, delete: if false;'),
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
  functions.includes("['owner', 'admin', 'contributor']"),
  'Backend Trip planning must reuse Space roles.',
);

need(
  functions.includes("type: 'trip_task_assigned'"),
  'Task assignment notification is missing.',
);

need(
  functions.includes("'trip_task_completed'") && functions.includes("'trip_task_reopened'"),
  'Trip Task completion activity is missing.',
);

need(
  functions.includes(
    "queryHasDocuments(db.collection('tripTasks').where('spaceId', '==', spaceId))",
  ),
  'Trip planning history must block destructive Space deletion.',
);

need(
  functions.includes(
    "'tripItineraryItems', 'tripTasks', 'tripBookings'",
  ),
  'Owned Space deletion must include Trip planning collections.',
);

need(
  functions.includes(
    "collectionName: 'tripTasks', field: 'assigneeUid'",
  ),
  'Trip Task account-deletion anonymization is missing.',
);

need(
  css.includes('/* Trip v2 Slice 2 - planning */'),
  'Trip planning CSS is missing.',
);

need(
  !panel.includes('window.confirm(') && !panel.includes('window.alert('),
  'Browser-native confirmation must not remain in Trip planning.',
);

need(
  panel.includes('archiveRequest') && panel.includes('confirmArchive'),
  'Trip planning must use the in-app archive confirmation flow.',
);
console.log(`Trip v2 Slice 2 planning checks passed (${checks.length} checks).`);
