import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

const command = read('src/features/spaces/TripCommandCentre.tsx');
const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const fund = read('src/features/spaces/SpaceFundPanel.tsx');
const css = read('src/styles/global.css');

const checks = [];

function need(condition, label) {
  checks.push(label);
  if (!condition) throw new Error(label);
}

for (const text of [
  'Trip command centre',
  'Trip at a glance',
  'Trip Fund collected',
  'Trip Fund available',
  'Trip Budget',
  'Treasurer',
  'Trip members',
  'Trip Expenses',
  'Review Settlements',
  'No Contributions yet',
  'No Trip Budget yet',
  'No Trip Expenses yet',
]) {
  need(command.includes(text), `Missing Trip command-centre text: ${text}`);
}

need(
  command.includes('getSpaceFund(space.id)'),
  'Trip overview must read the canonical Space Fund.',
);

need(
  command.includes('fund.contributedMinor'),
  'Trip overview must use contributedMinor.',
);

need(
  command.includes('fund.spentMinor'),
  'Trip overview must use spentMinor.',
);

need(
  command.includes('fund.availableMinor'),
  'Trip overview must use availableMinor.',
);

need(
  command.includes('budget.limitMinor'),
  'Trip overview must use real Budget records.',
);

need(
  command.includes('budget.spentMinor'),
  'Trip overview must use Budget spending.',
);

need(
  command.includes("expense.status !== 'paid'"),
  'Trip overview must show unsettled shared Expenses.',
);

need(
  details.includes("import { TripCommandCentre } from './TripCommandCentre';"),
  'SpaceDetailsPage must import TripCommandCentre.',
);

need(
  details.includes("activeTab === 'overview' && space.type === 'trip'"),
  'Command centre must only render on Trip overview.',
);

need(
  details.includes('onOpenTab={(tab) => chooseTab(tab)}'),
  'Trip shortcuts must use the existing Space tabs.',
);

need(
  fund.includes("targetLabel: 'Trip Fund target'"),
  'Trip Fund target terminology is missing.',
);

need(
  !fund.includes("targetLabel: 'Trip budget'"),
  'Trip Fund is still incorrectly labelled as Trip budget.',
);

need(
  fund.includes("targetHelp: 'How much the group plans to collect'"),
  'Trip Fund target guidance is missing.',
);

need(
  css.includes('/* Trip v2 Slice 1 - command centre */'),
  'Trip command-centre CSS is missing.',
);

console.log(`Trip v2 Slice 1 checks passed (${checks.length} checks).`);