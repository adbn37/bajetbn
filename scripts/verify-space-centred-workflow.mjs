import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['src/app/App.tsx', 'path="spaces/:spaceId"'],
  ['src/app/App.tsx', 'path="sharing" element={<Navigate to="/spaces" replace />}'],
  ['src/features/spaces/SpaceDetailsPage.tsx', 'export function SpaceDetailsPage'],
  ['src/features/spaces/SpaceDetailsPage.tsx', '<SpaceActionHub'],
  ['src/features/spaces/SpaceActionHub.tsx', 'lockedSpaceId={space.id}'],
  ['src/features/spaces/SpaceDetailsPage.tsx', 'spaceIdOverride={space.id}'],
  ['src/features/spaces/SpacesPage.tsx', 'navigate(`/spaces/${space.id}`)'],
  ['src/features/collaboration/CollaborationPage.tsx', 'embedded = false'],
  ['src/features/collaboration/CollaborationPage.tsx', "activeTab?: CollaborationTab"],
  ['src/features/collaboration/JoinSpacePage.tsx', 'navigate(`/spaces/${joinedSpaceId}`)'],
  ['src/features/calendar/CalendarPage.tsx', 'route: `/spaces/${item.spaceId}?tab=bills`'],
  ['src/features/search/SearchPage.tsx', 'route: `/spaces/${item.id}`'],
  ['src/styles/global.css', 'space-details-tabs'],
  ['SPACE_CENTRED_WORKFLOW_ALPHA.md', 'The standalone Sharing menu has been removed.'],
];

for (const [file, marker] of checks) {
  const content = read(file);
  if (!content.includes(marker)) throw new Error(`${file} is missing: ${marker}`);
}

const shell = read('src/layouts/AppShell.tsx');
if (shell.includes("'/sharing', 'Sharing'")) throw new Error('Sharing is still shown in the main navigation.');

const app = read('src/app/App.tsx');
if (app.includes('default: module.CollaborationPage')) throw new Error('The old standalone Collaboration page is still loaded as a top-level page.');

console.log(`Space-centred workflow checks passed (${checks.length} structural checks plus navigation checks).`);
