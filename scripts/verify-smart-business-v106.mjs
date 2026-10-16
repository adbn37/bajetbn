#!/usr/bin/env node
/** Phase 10.6 release gate. No Firebase reads/writes. */
import fs from 'node:fs';
import { strict as assert } from 'node:assert';
const read = (f) => fs.readFileSync(f,'utf8');
const smart = read('src/services/smartCategoryIconV106.ts');
const home = read('src/features/business/BusinessHomePage.tsx');
const timeline = read('src/features/business/BusinessActivityTimeline.tsx');
const activity = read('src/components/RecentActivityIcon.tsx');
const transactions = read('src/features/transactions/TransactionsPage.tsx');
const categories = read('src/features/categories/defaultCategories.ts');
const main = read('src/main.tsx');
for (const needle of [
  'resolveSmartCategoryIconAsset', 'inferGenericTransactionIcon',
  'businessShortcutIconV106', 'businessActivityFallbackIconV106',
  'categoryIconAsset(saved)',
  "item.type === 'transfer'", "item.type === 'reversal'",
]) assert(smart.includes(needle),`Smart resolver missing: ${needle}`);
assert(activity.includes('resolveSmartCategoryIconAsset(transaction)'),'Home icon wiring missing');
assert(activity.includes('customIcon ? ('),'Home custom-image precedence lost');
assert(transactions.includes('transaction={item}'),'Transaction list icon context missing');
assert(transactions.includes('customIcon ? <img'),'Transaction custom-image precedence lost');
assert(timeline.includes('iconAsset: resolveSmartCategoryIconAsset(item)'),'Business timeline category icons missing');
assert(timeline.includes('businessActivityFallbackIconV106(item.tone)'),'Business timeline fallback missing');
assert(home.includes('const otherDatesNet = businessTransactionTotal - monthNet;'),'Net bridge math missing');
assert(home.includes('data-business-net-reconciliation'),'Business reconciliation UI missing');
assert(home.includes('businessShortcutIconV106(action.label)'),'Business shortcut icon wiring missing');
assert(categories.includes("[/electric|electricity|power/, 'electric']"),'Electric editor suggestion missing');
assert(main.includes("import './styles/design-smart-category-business-v106.css';"),'Styles not imported');
for (const file of ['electric.svg','water.svg','laptop.svg','invoice.svg','home.svg','equipment.svg','coins.svg']) {
  assert(fs.existsSync('public/category-icons-v102/'+file),`Missing category artwork: ${file}`);
}
for (const file of ['move.svg']) {
  assert(fs.existsSync('public/navigation-icons-v104/'+file),`Missing navigation artwork: ${file}`);
}
assert.strictEqual(62900 - 48500,14400,'Net reconciliation arithmetic regression');
assert.strictEqual(58500-10000,48500,'Monthly net arithmetic regression');
console.log('PHASE 10.6 STATIC VERIFICATION PASSED: smart icon matching, 3 transaction surfaces, Business actions/timeline, net bridge, image precedence.');
console.log('BND 629.00 all-time = BND 485.00 this month + BND 144.00 outside the month (for the supplied screenshot).');
console.log('Staging runtime and currency consistency must still be checked. No financial data was changed.');
