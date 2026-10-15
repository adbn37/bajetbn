#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const fail = msg => { console.error(`PHASE 7 VERIFY FAIL: ${msg}`); process.exitCode = 1; };
const files = [
 'src/main.tsx',
 'src/features/transactions/TransactionsPage.tsx',
 'src/features/commitments/CommitmentsPage.tsx',
 'src/features/business/BusinessHomePage.tsx',
 'src/styles/design-stabilization-v7.css',
];
try {
 for (const p of files) if (!fs.existsSync(path.join(root, p))) throw Error(`Missing ${p}`);
 const main = read(files[0]), tx = read(files[1]), bills = read(files[2]), biz = read(files[3]), css = read(files[4]);
 const requireRepo = createRequire(path.join(root, 'package.json'));
 const ts = requireRepo('typescript');
 for (const p of files.slice(1, 4)) {
   const parsed = ts.createSourceFile(p, read(p), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
   if (parsed.parseDiagnostics.length) fail(`TSX parser errors in ${p}`);
 }
 if (!main.includes("import './styles/design-stabilization-v7.css';")) fail('Missing Phase 7 CSS import');
 if (!tx.includes('transaction-row bajetbn-v7-compact-row')) fail('Missing compact transaction card');
 if (!tx.includes('setSelectedTransaction(item)') || !tx.includes('setReceiptTransaction(item)')) fail('Transaction handlers no longer present');
 if (!bills.includes('<details className="bajetbn-v7-payment-history">') || !bills.includes('Recent payments · {fullPaymentHistory.length}')) fail('Missing accessible collapsible payment history');
 if (!bills.includes('onPay?.(item)') || !bills.includes('onViewHistory(')) fail('Payment handlers changed');
 if (!bills.includes('Remaining instalments + one cycle per active bill; not bank balance')) fail('Bills summary clarification missing');
 if (!biz.includes('All-time transaction net') || !biz.includes('Not a bank balance')) fail('Business net label missing');
 if (!css.includes('@media (max-width: 380px)') || !css.includes('.bajetbn-v7-compact-row') || !css.includes('.bajetbn-v7-payment-history')) fail('CSS missing responsive and card rules');
 if (process.exitCode) process.exit(process.exitCode);
 console.log('BajetBN Phase 7 targeted card stabilization: PASS (static checks only).');
} catch (e) { fail(e.message || String(e)); }
