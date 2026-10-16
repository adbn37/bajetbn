import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = p => fs.readFileSync(p,'utf8');
const tsx = read('src/features/transactions/TransactionsPage.tsx');
const entry = read('src/main.tsx');
const css = read('src/styles/design-transaction-success-v8.css');
assert.ok(entry.includes("import './styles/design-transaction-success-v8.css';"), 'CSS import missing');
for(const fragment of ['bajetbn-v8-transaction-success',"'Transaction Added'","'Transfer Added'", 'bajetbn-v8-success-icon', 'formatMoney(saved.amountMinor, saved.currency)', 'shareTransactionToWhatsApp(saved)', "outcome.mode === 'queued'", "outcome.mode === 'pending_approval'",'setSharePrompt({']) {
  assert.ok(tsx.includes(fragment), `Missing required source: ${fragment}`);
}
assert.ok(css.includes('prefers-reduced-motion'), 'Missing reduced motion support');
assert.equal((tsx.match(/bajetbn-v8-transaction-success/g)||[]).length,1,'Expected one success modal');
assert.equal((tsx.match(/if \(sharePrompt\)/g)||[]).length,1,'Existing success state changed unexpectedly');
console.log('BajetBN Phase 8 transaction-success popup: PASS (static checks; not runtime testing).');
