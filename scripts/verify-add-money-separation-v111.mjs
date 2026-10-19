#!/usr/bin/env node
/** Phase 11.1 verifier, upgraded after Phase 11.1.1 consolidation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const BASE = '3a77ef6c122b7626ce88af45171e3b9fd3a52808';
const original = 'src/features/transactions/TransactionsPage.tsx';
const modal = 'src/features/transactions/MoneyActivityModalV111.tsx';
const norm = x => x.replace(/\r\n?/g, '\n');
const source = norm(fs.readFileSync(original, 'utf8'));
const isolated = norm(fs.readFileSync(modal, 'utf8'));
const dashboard = norm(fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8'));
const previous = norm(execFileSync('git', ['show', `${BASE}:${original}`], {encoding: 'utf8'}));
const a = previous.indexOf('export function TransactionsPage() {');
const b = previous.indexOf('function CategoryIconVisual(', a);
assert(a >= 0 && b > a, 'Approved Phase 11.1 source not available');
assert.equal(isolated, previous.slice(0, a) + previous.slice(b), 'Money modal diverges from approved Phase 11.1 implementation');
assert(source.includes("import { MoneyActivityModal } from './MoneyActivityModalV111';"), 'Transactions page does not import the shared modal');
assert(source.includes("export { MoneyActivityModal } from './MoneyActivityModalV111';"), 'Original named export compatibility missing');
assert(!source.includes('export function MoneyActivityModal({'), 'Duplicate Add Money implementation remains');
assert(dashboard.includes("const loadMoneyActivityFeatureV107 = () => import('../features/transactions/MoneyActivityModalV111');"), 'Dashboard loading path changed');
assert(isolated.includes('function TransactionDetails('), 'Receipt details missing');
assert(isolated.includes('uploadTransactionAttachment'), 'Attachment handler missing');
assert(isolated.includes('resolveTransferPostingSpaceId'), 'Business transfer resolution missing');
assert(isolated.includes('onSubmit: (values: TransactionInput)'), 'Posting delegate contract missing');
console.log('BAJETBN PHASE 11.1 CONSOLIDATED STATIC VERIFICATION PASS');
console.log('One authoritative Add Money implementation; original Transactions route keeps compatible named export.');
