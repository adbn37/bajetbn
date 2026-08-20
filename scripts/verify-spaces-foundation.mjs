import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

let checks = 0;

function requireValue(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

const packageJson = JSON.parse(read('package.json'));
const experience = read('src/features/spaces/spaceExperience.ts');
const actionHub = read('src/features/spaces/SpaceActionHub.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const styles = read('src/styles/global.css');

requireValue(
  packageJson.version.localeCompare('1.4.1', undefined, { numeric: true, sensitivity: 'base' }) >= 0,
  'Spaces foundation requires BajetBN v1.4.1 or newer.',
);

for (const term of [
  'Contribution',
  'Fund',
  'Budget',
  'Expense',
  'Settlement',
  'Task',
  'Booking',
  'Payout',
]) {
  requireValue(
    experience.includes(`'${term}'`),
    `Shared Space terminology is missing ${term}.`,
  );
}

requireValue(
  experience.includes('getSpaceHomeExperience'),
  'Spaces must have one shared home-experience source of truth.',
);

requireValue(
  experience.includes("role === 'viewer'"),
  'View-only members need a role-aware Space home.',
);

requireValue(
  experience.includes("role === 'payer'"),
  'Payment members need a role-aware Space home.',
);

requireValue(
  experience.includes("primary: 'expenses'"),
  'Shared-money members need Expense as their main Space action.',
);

requireValue(
  actionHub.includes('getSpaceHomeExperience(space, currentMember)'),
  'Space Action Hub must consume the shared home experience.',
);

requireValue(
  actionHub.includes('primary-action'),
  'Space Action Hub must expose one clear primary action.',
);

requireValue(
  !actionHub.includes('Who owes whom'),
  'Legacy Who owes whom terminology remains in Space Action Hub.',
);

requireValue(
  actionHub.includes('Settlements'),
  'Space Action Hub must use Settlement terminology.',
);

requireValue(
  styles.includes('.space-action-button.primary-action'),
  'Primary Space actions need distinct visual hierarchy.',
);

requireValue(
  details.includes('Use the actions above to record the first money activity for this Space.'),
  'Money empty state must explain the next useful action.',
);

requireValue(
  details.includes('Create a Budget for this Space to start planning its spending.'),
  'Budget empty state must explain the next useful action.',
);

requireValue(
  details.includes('Add a bill or instalment for this Space to start tracking what is due.'),
  'Bill empty state must explain the next useful action.',
);

requireValue(
  details.includes('Add a bill, Budget period, or goal target to give this Space something to schedule.'),
  'Calendar empty state must explain the next useful action.',
);

requireValue(
  experience.includes('roleLabel:'),
  'Space home experience must expose the current role label.',
);

requireValue(
  experience.includes('accessSummary:'),
  'Space home experience must explain the current role access.',
);

requireValue(
  experience.includes('heading:'),
  'Space home experience must provide role-aware home headings.',
);

requireValue(
  experience.includes("role === 'owner'"),
  'Owners need a distinct Space-home experience.',
);

requireValue(
  experience.includes("role === 'admin'"),
  'Managers need a distinct Space-home experience.',
);

requireValue(
  actionHub.includes('space-home-access'),
  'Space home must show a compact role/access summary.',
);

requireValue(
  actionHub.includes('data-secondary-label="More Space tools"'),
  'Secondary Space capabilities must be visually grouped.',
);

requireValue(
  styles.includes('.space-home-access'),
  'Role-aware Space access needs dedicated compact styling.',
);

requireValue(
  styles.includes('.space-action-buttons::before'),
  'Secondary Space tools need a visible group heading.',
);

requireValue(
  styles.includes('content: attr(data-secondary-label);'),
  'Space capability grouping must use the Action Hub group label.',
);

console.log(`Spaces foundation Slice 1 + Slice 2 checks passed (${checks} structural checks).`);