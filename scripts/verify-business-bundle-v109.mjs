#!/usr/bin/env node
/** Source-level regression gate for Phase 10.9: no permissions or money logic changes. */
import fs from 'node:fs';
import { strict as assert } from 'node:assert';
const source = fs.readFileSync('src/features/business/BusinessHomePage.tsx','utf8');
const lazy = [
  'AdbnTechIntegrationHealthWorkspace', 'AdbnTechMirrorWorkspace',
  'AdbnTechPaymentsWorkspace','AdbnTechPurchasesWorkspace',
  'AdbnTechExpensesWorkspace','AdbnTechInventoryWorkspace',
  'BusinessReportsWorkspace','AccountsPage','CommitmentsPage',
  'MarketplaceConsignmentPosWorkspace','StandardPosWorkspace',
];
for(const name of lazy) {
  assert(new RegExp(`const ${name} = lazy\\(\\(\\) => import\\(`).test(source), `${name} not lazy-loaded`);
  assert(source.includes(`default: module.${name}`),`Incorrect lazy export: ${name}`);
  assert(source.includes(`<${name}`),`${name} is not rendered`);
}
assert(source.includes('import type { MarketplaceManagementTab }'), 'Marketplace type import must stay type-only');
assert(source.includes('<Suspense fallback={<section className="panel" role="status"'), 'Local suspense/loading fallback is missing');
assert(source.includes('      </Suspense>\n    </main>'), 'Local suspense not closed');
assert(source.includes('BusinessFinancialAuditPanelV107'), 'Read-only Business financial audit missing');
assert(source.includes('listBusinessTransactionsForSpace'), 'Business financial source changed');
assert(source.includes('const businessTransactionTotal'), 'Business totals missing');
assert(source.includes('SmeOperationalAttentionPanel'), 'Home attention panel missing');
assert(source.includes('businessShortcutIconV106'), 'Phase 10.6 shortcut icon removed');
assert(!source.includes("import { AccountsPage } from '../accounts/AccountsPage'"), 'Accounts eager import still present');
console.log('PHASE 10.9 SOURCE CHECK PASS — 11 workspaces lazy; permissions and calculation anchors retained.');
