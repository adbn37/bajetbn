import fs from 'node:fs';
const read = (p) => fs.readFileSync(p,'utf8').replace(/\r\n?/g,'\n');
const check = (c,m) => { if(!c) throw new Error('FAIL: '+m); console.log('PASS: '+m); };
const home=read('src/features/business/BusinessHomePage.tsx');
const health=read('src/features/business/AdbnTechIntegrationHealthWorkspace.tsx');

check(home.includes("'adbn_integration'") && home.includes('AdbnTechIntegrationHealthWorkspace') && home.includes('Integration'), 'Owner ADBN workspace has Integration tab.');
check(health.includes('data-adbn-tech-integration-health') && health.includes('Integration health') && health.includes('read-only against ADBN TECH'), 'Dashboard is explicitly read-only.');
check(health.includes('loadAdbnTechReadOnlySnapshot') && health.includes('loadAdbnTechPaymentsReadOnly') && health.includes('loadAdbnTechPurchasesReadOnly') && health.includes('loadAdbnTechExpensesReadOnly') && health.includes('loadAdbnTechInventoryReadOnly'), 'Dashboard summarizes existing mirrors.');
check(health.includes('externalIntegrationAccountMappings') && health.includes('unmapped') && health.includes('broken'), 'Dashboard reports account mapping health.');
check(health.includes('externalIntegrationPaymentAutoSyncEnabled') && health.includes('externalIntegrationPaymentAutoSyncCutoffIso') && health.includes('externalIntegrationExpenseAutoSyncEnabled'), 'Dashboard reports payment and expense automation state.');
check(health.includes('findStalePostedAdbnExpenseTransactions') && health.includes('Missing expenses'), 'Dashboard surfaces stale expense count without automatic reversal.');
check(health.includes('ADBN purchase date from 25 Sep 2026 onward'), 'Supplier fixed automation cutoff remains visible.');
check(!health.includes('setDoc(') && !health.includes('updateDoc(') && !health.includes('deleteDoc('), 'No ADBN write path introduced.');
console.log('BajetBN ADBN TECH integration health verification PASS');
