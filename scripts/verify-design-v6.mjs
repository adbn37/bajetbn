#!/usr/bin/env node
/* Static/structural verification only: not a substitute for app build or browser testing. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function check(cond,text){if(!cond)throw Error('Phase 6 verification FAILED: '+text);}
const main=read('src/main.tsx');
const home=read('src/pages/DashboardPage.tsx');
const tx=read('src/features/transactions/TransactionsPage.tsx');
const css=read('src/styles/design-motion-v6.css');
check(main.includes("import './styles/design-motion-v6.css';"),'stylesheet not imported');
check(home.includes('bajetbn-design-motion-v6"'),'Home marker missing');
for(const className of ['bajetbn-v5-financial-workspace','bajetbn-v6-balance-details','bajetbn-v6-month','bajetbn-v6-action-section','bajetbn-home-account-strip']) check(home.includes(className),`missing ${className}`);
check(!home.includes('className="bajetbn-v4-account-month"'),'old standalone month panel remains');
check((home.match(/selectedAccountMonth\.income/g)||[]).length>=3,'existing posted-income data not present');
check(home.includes('selected account · transfers excluded'),'account scope disclaimer missing');
check(home.includes('formatMoney(totalPersonalAssets,')||/formatMoney\(\s*totalPersonalAssets/.test(home),'existing total-assets formatter missing');
check(home.indexOf('bajetbn-v6-month')<home.indexOf('bajetbn-home-account-strip'),'overview must be above accounts');
check(home.indexOf('bajetbn-home-account-strip')<home.indexOf('bajetbn-v6-action-section'),'accounts must precede action row');
check(home.includes("void openQuickActivity('move')") && home.includes('to="/transactions"'),'existing money handlers missing');
check(tx.includes('bajetbn-v6-money-sheet'),'Money Activity sheet marker missing');
const entry=tx.indexOf('className="bajetbn-v6-money-sheet"')>=0?tx.indexOf('className="bajetbn-v6-money-sheet"'):tx.indexOf('bajetbn-v5-money-sheet bajetbn-v6-money-sheet');
check(entry>=0,'Main Money Activity sheet missing');
const amount=tx.indexOf('className="bajetbn-reference-amount bajetbn-add-amount"',entry);
const type=tx.indexOf('className="segmented-control transaction-type-picker"',entry);
const account=tx.indexOf('className="bajetbn-reference-account-row bajetbn-identity-field"',entry);
check(amount>entry && type>amount && account>type,'amount → type → account order not present');
check(tx.includes('setAmount(event.target.value)') && tx.includes('setType(value)'),'original form handlers missing');
check(css.includes('prefers-reduced-motion'),'missing motion accessibility');
console.log('BajetBN Phase 6 static wiring: PASS (does not verify runtime financial workflows).');
