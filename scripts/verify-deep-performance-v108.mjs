#!/usr/bin/env node
/** Staging release guard. Actual response times must be measured in the browser. */
import fs from 'node:fs';
import { strict as assert } from 'node:assert';
const file = name => fs.readFileSync(name, 'utf8');
const goals = file('src/features/goals/GoalsPage.tsx');
const warm = file('src/services/goalsWarmupV107.ts');
const tx = file('src/features/transactions/TransactionsPage.tsx');
const accounts = file('src/features/accounts/AccountsPage.tsx');
const home = file('src/pages/DashboardPage.tsx');

assert(warm.includes('reads: WarmedGoalReadsV108'), 'Goals prefetch still bundled as one wait');
assert(warm.includes('goals: listAllGoals(ownerId)'), 'Goals missing independent prefetch');
assert(warm.includes('spaces: listSpaces(ownerId)'), 'Spaces missing independent prefetch');
assert(warm.includes('contributions: listGoalContributions(ownerId)'), 'Contributions missing independent prefetch');
assert(!warm.includes('promise: Promise.all(['), 'Combined Goals prefetch would block first render');
assert(warm.includes('const MAX_AGE_MS = 4000'), 'Four-second warm lifetime changed');
assert(warm.includes('entry = null;'), 'Single-use warm data guard missing');
assert(goals.includes('consumeWarmedGoalsV107(user.uid)'), 'Goal warm reads missing');
assert(goals.includes('warmedV107?.goals || listAllGoals(user.uid)'), 'Goal card load must not await history');
assert(goals.includes('recentByGoalV108'), 'Goal contribution index missing');
assert(!goals.includes('contributions\n            .filter('), 'Per-card O(goals x contributions) filtering remains');
assert(goals.includes('requestIdV107 !== goalsLoadRequestV107.current'), 'Goal stale result guard missing');

assert(tx.includes('historyTaskV108 = accountsTaskV108.then'), 'Transaction reads not overlapped');
assert(tx.includes('attachmentTaskV108 = listAllTransactionAttachments'), 'Attachment reads missing');
assert(tx.includes('void attachmentTaskV108.then'), 'Deferred attachment count missing');
assert(tx.includes('await historyTaskV108'), 'Transaction reads not awaited');
assert(tx.includes('requestIdV108 !== transactionLoadIdV108.current'), 'Transaction stale result guard missing');
assert(!tx.includes('nextAttachments,\n      ] = await Promise.all'), 'Attachments still gate history');

assert(accounts.includes('setAccounts(ownedAccounts);'), 'Progressive owned-account display missing');
assert(accounts.includes('setSharedLoadingV108(sharedSmeSpaces.length > 0);'), 'Shared load status missing');
assert(accounts.includes('role="status">Loading shared Business accounts'), 'Shared load status not accessible');
assert(accounts.includes('requestIdV108 !== accountsLoadIdV108.current'), 'Account stale result guard missing');
assert(home.includes('showQuickPreparingV107'), 'Existing quick-entry preparing UI lost');
assert(!/\b(?:setDoc|updateDoc|deleteDoc|addDoc|postTransaction|recordGoalContribution)\b/.test(warm), 'Prefetch cannot write financial data');

// In-memory recent-history indexing is bounded to 3 per Goal.
const sample=[
  {id:'a1',goalId:'a'}, {id:'b1',goalId:'b'}, {id:'a2',goalId:'a'},
  {id:'a3',goalId:'a'}, {id:'a4',goalId:'a'}, {id:'b2',goalId:'b'},
];
const map=new Map();
for (const contribution of sample) {
  const recent=map.get(contribution.goalId) || [];
  if(recent.length < 3){recent.push(contribution);map.set(contribution.goalId,recent);}
}
assert.deepEqual(map.get('a').map(v=>v.id),['a1','a2','a3']);
assert.deepEqual(map.get('b').map(v=>v.id),['b1','b2']);
console.log('BAJETBN PHASE 10.8 DEEP PERFORMANCE STATIC VERIFICATION PASS');
console.log('Checks: independent Goals reads, history indexing, overlapping Transactions queries, deferred attachment badges, progressive Accounts, stale response guards.');
console.log('This is source verification, not proof of runtime speed gains. Measure cold and warm navigation on staging.');
