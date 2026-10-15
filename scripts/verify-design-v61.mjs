#!/usr/bin/env node
/* Static only. App build and end-to-end finance checks still required. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
function assert(v,msg){if(!v)throw Error('Phase 6 stabilization verify FAILED: '+msg);}
const main=rd('src/main.tsx');
const tx=rd('src/features/transactions/TransactionsPage.tsx');
const css=rd('src/styles/design-motion-v6-stabilization.css');
assert(main.includes("import './styles/design-motion-v6-stabilization.css';"),'missing CSS import');
assert(tx.includes('bajetbn-v6-money-sheet bajetbn-v61-money-sheet'),'entry-modal class missing');
const form=tx.indexOf('className="bajetbn-v6-money-sheet bajetbn-v61-money-sheet"')>=0
 ? tx.indexOf('className="bajetbn-v6-money-sheet bajetbn-v61-money-sheet"')
 : tx.indexOf('bajetbn-v5-money-sheet bajetbn-v6-money-sheet bajetbn-v61-money-sheet');
assert(form>=0,'expected entry modal marker');
const scroll=tx.indexOf('className="bajetbn-v61-form-scroll"',form);
const amount=tx.indexOf('className="bajetbn-reference-amount bajetbn-add-amount"',scroll);
const type=tx.indexOf('className="segmented-control transaction-type-picker"',amount);
const account=tx.indexOf('className="bajetbn-reference-account-row bajetbn-identity-field"',type);
const footer=tx.indexOf('className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={closeForm}',account);
assert(scroll>form && amount>scroll && type>amount && account>type && footer>account,'entry fields and footer order changed');
assert(tx.includes('setAmount(event.target.value)') && tx.includes('setType(value)'),'original money controls missing');
assert(tx.includes('disabled={busy || compatibleAccounts.length === 0 || (type !== \'transfer\' && !selectedCategory)}'),'post guard missing');
assert(css.includes('.bajetbn-v61-money-sheet .bajetbn-v61-form-scroll'),'scroll region missing');
assert(css.includes('prefers-reduced-motion'),'reduced motion support missing');
assert(css.includes('safe-area-inset-bottom'),'safe-area support missing');
console.log('BajetBN Phase 6 stabilization: PASS (static wiring only).');
