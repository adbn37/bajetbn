#!/usr/bin/env node
/* Structural check only; does NOT verify the browser workflow or Firebase. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
function ok(condition,message){if(!condition)throw Error('Money Entry Repair FAILED: '+message);}
const main=read('src/main.tsx');
const css=read('src/styles/design-motion-v6-money-repair.css');
const tx=read('src/features/transactions/TransactionsPage.tsx');
const form=tx.indexOf('bajetbn-v61-money-sheet');
const scroller=tx.indexOf('className="bajetbn-v61-form-scroll"',form);
const picker=tx.indexOf('className="segmented-control transaction-type-picker"',scroller);
const account=tx.indexOf('className="bajetbn-reference-account-row bajetbn-identity-field"',picker);
const footer=tx.indexOf('className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={closeForm}',account);
ok(form>=0&&scroller>form&&picker>scroller&&account>picker&&footer>account,'Money Activity structure/handlers are not in expected order');
ok(tx.includes('typeOptions.map((value) => <button') && tx.includes('setType(value)'), 'Original type selection is missing');
ok(tx.includes("(type !== 'transfer' && !selectedCategory)"), 'Save guard missing');
ok(main.includes("import './styles/design-motion-v6-stabilization.css';"),'phase6 stabilization not installed');
ok((main.match(/import '\.\/styles\/design-motion-v6-money-repair.css';/g)||[]).length===1,'repair stylesheet must be imported once');
ok(main.indexOf('design-motion-v6-stabilization.css')<main.indexOf('design-motion-v6-money-repair.css'),'repair CSS must come after stabilization CSS');
ok(css.includes('flex: 0 0 auto') && css.includes('overflow: visible !important') && css.includes('transaction-type-picker'),'selector shrink/overflow fix missing');
ok(css.includes('prefers-reduced-motion'),'reduced motion guard missing');
console.log('BajetBN Money Entry Repair: PASS (static wiring only).');
