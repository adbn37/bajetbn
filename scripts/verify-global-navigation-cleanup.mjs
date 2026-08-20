import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const navigation = read('src/services/personalisation.ts');
const customizer = read('src/components/SidebarCustomizer.tsx');
const shell = read('src/layouts/AppShell.tsx');

let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

for (const id of [
  'overview',
  'spaces',
  'transactions',
  'accounts',
  'budgets',
  'bills',
  'search',
]) {
  check(
    navigation.includes(`'${id}'`),
    `Recommended navigation is missing ${id}.`,
  );
}

for (const id of [
  'recurring',
  'goals',
  'calendar',
  'reports',
  'offline-sync',
]) {
  check(
    navigation.includes(`'${id}'`),
    `Optional navigation is missing ${id}.`,
  );
}

check(
  navigation.includes('RECOMMENDED_NAVIGATION_ORDER'),
  'Recommended navigation order is missing.',
);

check(
  navigation.includes('RECOMMENDED_HIDDEN_NAVIGATION'),
  'Recommended hidden navigation is missing.',
);

check(
  navigation.includes("id: 'overview'")
    && navigation.match(/id:\s*'overview'[\s\S]*?protected:\s*true/),
  'Overview must remain protected.',
);

check(
  navigation.includes("id: 'spaces'")
    && navigation.match(/id:\s*'spaces'[\s\S]*?protected:\s*true/),
  'Spaces must remain protected.',
);

check(
  navigation.includes('orderSource = Array.isArray(value?.navigationOrder)'),
  'Saved navigation order must remain respected.',
);

check(
  navigation.includes('hiddenSource = Array.isArray(value?.hiddenNavigation)'),
  'Saved hidden navigation must remain respected.',
);

check(customizer.includes('toggleHidden'), 'Hide/show support was removed.');
check(customizer.includes('togglePinned'), 'Pin support was removed.');
check(customizer.includes('dropOn'), 'Drag/reorder support was removed.');
check(customizer.includes('Reset menu'), 'Reset menu was removed.');
check(
  customizer.includes('recommended simple layout'),
  'Recommended reset explanation is missing.',
);

check(
  shell.includes('orderedNavigation'),
  'AppShell must continue using personalized navigation.',
);

const spacesIndex = shell.indexOf('<small>Spaces</small>');
const posIndex = shell.indexOf('<small>POS</small>');
const homeIndex = shell.indexOf('<small>Home</small>');
const alertsIndex = shell.indexOf('<small>Alerts</small>');
const moreIndex = shell.indexOf('<small>More</small>');

check(
  spacesIndex >= 0
    && spacesIndex < posIndex
    && posIndex < homeIndex
    && homeIndex < alertsIndex
    && alertsIndex < moreIndex,
  'Mobile navigation order must remain Spaces, POS, Home, Alerts, More.',
);

console.log(`Global navigation cleanup checks passed (${checks} checks).`);