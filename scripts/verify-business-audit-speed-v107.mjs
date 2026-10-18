#!/usr/bin/env node
import fs from 'node:fs';
import { strict as assert } from 'node:assert';
import { auditBusinessTransactionsV107, bruneiMonthV107 } from '../src/services/businessFinancialAuditV107.ts';
const read=(file)=>fs.readFileSync(file,'utf8');
const home=read('src/pages/DashboardPage.tsx');
const business=read('src/features/business/BusinessHomePage.tsx');
const panel=read('src/features/business/BusinessFinancialAuditPanelV107.tsx');
const css=read('src/styles/design-business-audit-speed-v107.css');
const main=read('src/main.tsx');
assert(home.includes('loadMoneyActivityFeatureV107()'), 'Money Activity preload not wired');
assert(home.includes('setShowQuickPreparingV107(true)'), 'First-click preparing feedback missing');
assert(home.includes('quickPrepareIdV107.current'), 'Cancel guard missing');
assert(home.includes('listAllCustomCategories(ownerId)'), 'Category prefetch missing');
assert(home.includes('loadMoneyActivityFeatureV107().catch'), 'Eager background module fetch missing');
assert(home.includes('onClose={closeQuickActivity}'), 'Preparing cancel button missing');
assert(home.includes('showMoneyActivity'), 'Money Activity modal lost');
assert(business.includes('primaryCurrencyTransactionsV107'), 'Currency guard missing');
assert(business.includes('bruneiMonthV107()'), 'Brunei timezone month missing');
assert(business.includes('setAuditTransactionsV107(nextTransactions)'), 'Read-only audit snapshot missing');
assert(business.includes('<BusinessFinancialAuditPanelV107'), 'Audit UI not wired');
assert(panel.includes('<details'), 'Audit panel must be collapsed by default');
assert(!/\b(?:postTransaction|updateTransaction|reverseTransaction|setDoc|addDoc|updateDoc|deleteDoc)\b/.test(panel), 'Audit panel must not write data');
assert(css.includes('.business-audit-v107'), 'Audit visual styles missing');
assert(main.includes('design-business-audit-speed-v107.css'), 'Styles not imported');
const shell=read('src/layouts/AppShell.tsx');
const goals=read('src/features/goals/GoalsPage.tsx');
const routeWarmup=read('src/services/routeWarmupV107.ts');
const goalsWarmup=read('src/services/goalsWarmupV107.ts');
assert(shell.includes('warmRouteV107(url.pathname)'), 'Route intent prefetch missing');
assert(shell.includes("import('../services/goalsWarmupV107')"), 'Goals data prefetch must be on-demand, not eager in app shell');
assert(shell.includes('warmGoalsV107(ownerId)'), 'Goals intent read prefetch missing');
assert(shell.includes("window.location.pathname !== '/'"), 'Idle prefetch not restricted to Home');
assert(goals.includes('consumeWarmedGoalsV107(user.uid)'), 'Goals single-use prefetch not consumed');
assert(goals.includes('void goalsCallV107.then'), 'Progressive Goals list not wired');
assert(goals.includes('requestIdV107 !== goalsLoadRequestV107.current'), 'Goals stale-response guard missing');
assert(goals.includes('goalRecordsReadyV107 && ('), 'Goals empty state not guarded');
assert(routeWarmup.includes("'/accounts'") && routeWarmup.includes("'/goals'") && routeWarmup.includes("'/transactions'"), 'Main route coverage missing');
assert(goalsWarmup.includes('const MAX_AGE_MS = 4000'), 'Goals warm cache must have short lifetime');
assert(goalsWarmup.includes('entry = null;'), 'Goals warmed data must be consumed once');
assert(!/(?:setDoc|addDoc|updateDoc|deleteDoc|postTransaction|recordGoalContribution)/.test(goalsWarmup), 'Goals warmup must be read-only');

assert.equal(bruneiMonthV107(new Date('2026-09-30T16:05:00Z')), '2026-10', 'Brunei first-of-month boundary');
const row=(id,type,amountMinor,currency,transactionDate,extras={})=>({id,type,amountMinor,currency,transactionDate,status:'posted',...extras});
const audit=auditBusinessTransactionsV107([
  row('i1','income',58500,'BND','2026-10-10',{businessInvoicePaymentId:'invoice-a'}),
  row('e1','expense',10000,'BND','2026-10-10'),
  row('i2','income',14400,'BND','2026-09-21'),
  row('fx','income',900000,'MYR','2026-10-10'),
  row('t','transfer',4444,'BND','2026-10-10'),
  row('rev','reversal',555,'BND','2026-10-10'),
  row('r1','income',7000,'BND','2026-10-09',{status:'reversed'}),
  row('i3','income',0,'BND','2026-10-11',{businessInvoicePaymentId:'invoice-a'}),
], 'BND','2026-10');
assert.equal(audit.month.net,48500);
assert.equal(audit.otherDates.net,14400);
assert.equal(audit.allTime.net,62900);
assert.equal(audit.excludedCurrencies[0].currency,'MYR');
assert.equal(audit.excludedTransfers,1);
assert.equal(audit.excludedReversals,1);
assert.equal(audit.excludedStatuses,1);
assert.equal(audit.possiblyRepeatedInvoicePaymentIds.length,1);
assert.equal(audit.month.net+audit.otherDates.net,audit.allTime.net);
console.log('BAJETBN PHASE 10.7 FINANCIAL + FULL-APP SPEED AUDIT VERIFICATION: PASS (BND 629.00 reconciliation, foreign currency, status, transfer, reversal, invoice diagnostics, Brunei month, first tap UI).');
console.log('NOTE: Source + unit tests only. Test backend/account accuracy and first-click responsiveness on staging before promoting.');
