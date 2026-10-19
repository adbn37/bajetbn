#!/usr/bin/env node
/** Verify source-exact modal isolation. Normalizes CRLF to work on Windows. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASELINE = 'b9c087f961ffb44ea8998a78e7714903a44bbae9';
const normalize = x => x.replace(/\r\n?/g, '\n');
const read = p => normalize(fs.readFileSync(p, 'utf8'));
const originalPath = 'src/features/transactions/TransactionsPage.tsx';
const newPath = 'src/features/transactions/MoneyActivityModalV111.tsx';
const original = read(originalPath);
const generated = read(newPath);
const home = read('src/pages/DashboardPage.tsx');
const start = original.indexOf('export function TransactionsPage() {');
const end = original.indexOf('function CategoryIconVisual(');
assert(start > 0 && end > start, 'TransactionsPage source layout changed');
assert.equal(generated, original.slice(0, start) + original.slice(end), 'Modal copy differs from the original production implementation');
assert(generated.includes('export function MoneyActivityModal('), 'Missing modal export');
assert(!generated.includes('export function TransactionsPage() {'), 'Transaction list leaked into isolated modal module');
assert(generated.includes('function CategoryEditor('), 'Category manager missing');
assert(generated.includes('function TransactionDetails('), 'Receipt details missing');
assert(generated.includes('uploadTransactionAttachment'), 'Attachment handling missing');
assert(generated.includes('resolveTransferPostingSpaceId'), 'Transfer destination selection missing');
assert(generated.includes('onSubmit: (values: TransactionInput)'), 'Posting callback contract missing');
assert(generated.includes('onComplete: (message: string, refresh: boolean)'), 'Post-save completion contract missing');
assert(home.includes("const loadMoneyActivityFeatureV107 = () => import('../features/transactions/MoneyActivityModalV111');"), 'Dashboard still loads full Transactions module');
assert(!home.includes("const loadMoneyActivityFeatureV107 = () => import('../features/transactions/TransactionsPage');"), 'Old Dashboard load path remains');
assert(home.includes('const MoneyActivityModal = lazy('), 'Dashboard must keep lazy modal');
assert(home.includes('showQuickPreparingV107'), 'Preparation feedback missing');
assert(home.includes('onSubmit={postTransaction}'), 'Dashboard posting delegate changed');
const base = execFileSync('git', ['show', `${BASELINE}:${originalPath}`], {encoding:'utf8'});
assert.equal(original, normalize(base), 'Original TransactionsPage differs from approved production baseline');
console.log('BAJETBN PHASE 11.1 STATIC VERIFICATION PASS');
console.log('Verified source-identical Add Money modal, receipt and transfer handlers, unmodified TransactionsPage, and lazy Dashboard loader.');
console.log('NOTE: This is a staging isolation experiment with duplicated source; verify bundle and browser behavior before promoting.');
