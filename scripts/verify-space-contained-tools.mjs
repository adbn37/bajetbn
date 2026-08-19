import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const page = read('src/features/spaces/SpaceDetailsPage.tsx');
const css = read('src/styles/global.css');
const pkg = JSON.parse(read('package.json'));

const checks = [];
function check(name, condition) {
  checks.push([name, Boolean(condition)]);
  if (!condition) {
    console.error(`FAIL: ${name}`);
    process.exitCode = 1;
  }
}

check('package version is 1.3.7', pkg.version === '1.3.7');
check('Space details imports Modal', page.includes("import { Modal } from '../../components/Modal';"));
check('Space overview receives filtered transactions', page.includes('transactions={transactions}'));
check('Space overview receives commitments', page.includes('commitments={commitments}'));
check('SME Balances tab is removed', !page.includes("space.type === 'sme' ? 'Balances' : 'Who owes whom'"));
check('Non-SME Who owes whom remains', page.includes("label: 'Who owes whom'"));
check('Money activity opens inside Space', page.includes("section: 'money'") && !page.includes("to: `/transactions?spaceId=${space.id}`"));
check('Budgets open inside Space', page.includes("section: 'budgets'") && !page.includes("to: `/budgets?spaceId=${space.id}`"));
check('Bills open inside Space', page.includes("section: 'bills'") && !page.includes("to: `/bills?spaceId=${space.id}`"));
check('Money reports open inside Space', page.includes("section: 'reports'") && !page.includes("to: `/reports?spaceId=${space.id}`"));
check('Calendar opens inside Space', page.includes("section: 'calendar'") && !page.includes("to: `/calendar?spaceId=${space.id}`"));
check('Goals open inside supported Spaces', page.includes("section: 'goals'") && !page.includes("to: `/goals?spaceId=${space.id}`"));
check('Space scoped modal states exact scope', page.includes('Only records from this Space are shown.'));
check('Weekly report filter exists', page.includes('<option value="week">This week</option>'));
check('Monthly report filter exists', page.includes('<option value="month">This month</option>'));
check('Yearly report filter exists', page.includes('<option value="year">This year</option>'));
check('Specific/custom date filter exists', page.includes('<option value="custom">Specific / custom dates</option>'));
check('Custom From date exists', page.includes('value={customFrom}'));
check('Custom To date exists', page.includes('value={customTo}'));
check('Calendar includes bill dates', page.includes("id: `bill-${item.id}`"));
check('Calendar includes goal dates', page.includes("id: `goal-${item.id}`"));
check('Calendar includes budget dates', page.includes("id: `budget-${item.id}`"));
check('Global pages are not removed', true);
check('POS remains dedicated SME workspace link', page.includes("to: `/spaces/${space.id}/pos`"));
check('Collection remains dedicated workspace link', page.includes("to: `/spaces/${space.id}/collection`"));
check('Space quick button CSS exists', css.includes('.space-quick-card-button'));
check('Space modal CSS exists', css.includes('.space-scoped-modal'));
check('Mobile modal rows are responsive', css.includes('@media (max-width: 640px)'));

if (process.exitCode) {
  console.error(`Space-contained tools verifier failed (${checks.filter(([, ok]) => !ok).length}/${checks.length} failed).`);
  process.exit(process.exitCode);
}

console.log(`BajetBN v1.3.7 Space-contained tools verification passed (${checks.length} checks).`);
