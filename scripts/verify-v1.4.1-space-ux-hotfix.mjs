import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const fail = (message) => { throw new Error(message); };
const need = (source, token, message) => {
  if (!source.includes(token)) fail(message);
};

const packageJson = JSON.parse(read('package.json'));
if (packageJson.version !== '1.4.1') fail(`Expected package version 1.4.1, found ${packageJson.version}.`);

const tx = read('src/features/transactions/TransactionsPage.tsx');
const modalStart = tx.indexOf('export function MoneyActivityModal({');
const modalEnd = tx.indexOf('\nfunction CategoryEditor(', modalStart);
if (modalStart < 0 || modalEnd < 0) fail('MoneyActivityModal boundaries missing.');
const modal = tx.slice(modalStart, modalEnd);
need(modal, 'const { user } = useAuth();', 'MoneyActivityModal user context fallback missing.');
need(modal, '>+ Add category</button>', 'Global + Add category action missing.');
if (/\{onCategoriesChanged\s*&&\s*<button[^>]*>\+ Add category<\/button>\}/.test(modal)) {
  fail('+ Add category is still conditional on onCategoriesChanged.');
}
need(modal, '...(await listAllCustomCategories(user.uid)).filter((item) => !item.archivedAt)', 'Category refresh fallback missing.');
need(modal, "defaultKind={type === 'income' ? 'income' : 'expense'}", 'New category type inheritance missing.');
need(modal, 'if (created) setCategoryId(created.id);', 'New category auto-selection missing.');

const details = read('src/features/spaces/SpaceDetailsPage.tsx');
const financeStart = details.indexOf('  const sharedFinanceTabs:');
const tabsStart = details.indexOf('  const tabs:', financeStart);
if (financeStart < 0 || tabsStart < 0) fail('Space finance-tab block missing.');
const financeBlock = details.slice(financeStart, tabsStart);
need(financeBlock, "space.type === 'sme' && canViewSmeFinancials", 'SME finance-tab condition missing.');
need(financeBlock, "{ id: 'expenses', label: 'Expenses' }", 'SME Expenses tab missing.');
need(financeBlock, "{ id: 'bills', label: 'Shared bills' }", 'SME Shared bills tab missing.');
if (financeBlock.includes('supportsGroupFund')) fail('Fund tab remains duplicated beside Quick Space Actions.');
if (financeBlock.includes("'balances'")) fail('Who owes whom tab remains duplicated beside Quick Space Actions.');
if (financeBlock.includes("label: 'Shared expenses'")) fail('Shared expenses tab remains duplicated beside Quick Space Actions.');
need(details, "if (shared && (value === 'members' || value === 'bills' || value === 'expenses' || value === 'balances' || value === 'trip_money' || value === 'group_fund' || value === 'activity'))", 'Hidden tool deep-link support changed.');

const hub = read('src/features/spaces/SpaceActionHub.tsx');
need(hub, "if (space.type === 'sme') return null;", 'SME Quick Space Action boundary changed.');
for (const token of ['Shared expenses', 'Who owes whom', 'Shared bills']) {
  need(hub, token, `Quick Space Action missing: ${token}`);
}

const css = read('src/styles/global.css');
need(css, '/* v1.4.1 Space UX hotfix */', 'v1.4.1 modal CSS marker missing.');
need(css, '.space-tool-modal {', 'Space tool modal override missing.');
need(css, 'min-width: 0;', 'Space tool modal min-width override missing.');
need(css, 'overflow-wrap: anywhere;', 'Space tool modal text wrapping missing.');
need(css, 'grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));', 'Responsive modal summary grid missing.');

console.log('BajetBN v1.4.1 Space UX hotfix verifier: PASS');
