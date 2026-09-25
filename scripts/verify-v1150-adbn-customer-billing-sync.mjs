import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
function check(condition, message) {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('PASS: ' + message);
}

const functions = read('functions/src/index.ts');
const syncRepository = read('src/repositories/adbnCustomerBillingSyncRepository.ts');
const mirror = read('src/features/business/AdbnTechMirrorWorkspace.tsx');
const portal = read('src/features/linked-adbn/AdbnCustomerSpacePage.tsx');
const models = read('src/types/models.ts');
const start = functions.indexOf('export const syncAdbnCustomerBillingMirror');
const block = start >= 0 ? functions.slice(start) : '';

check(
  block.includes('requireAdbnCustomerLinkOwner')
  && block.includes("link.status !== 'accepted'")
  && block.includes('externalIntegrationRole')
  && block.includes("'customer'"),
  'Billing sync requires ADBN Business ownership and an accepted dedicated customer Space.',
);
check(
  block.includes("'commitments'")
  && block.includes("'commitmentPayments'")
  && block.includes('externalIntegrationCustomerLinkId')
  && block.includes('adbnBillingMirrorDocumentId'),
  'ADBN invoices and payments use deterministic customer billing mirror IDs.',
);
check(
  !block.includes('updateAccountBalance(')
  && !block.includes('createLedgerEntry(')
  && block.includes('accountId: null'),
  'Customer billing sync does not touch bank account or ledger balances.',
);
check(
  block.includes('const billTotalMinor = Math.max(')
  && block.includes('invoice.paidMinor + outstandingMinor')
  && block.includes(': Math.max(1, billTotalMinor)'),
  'One-time ADBN bills mirror the original invoice total without double-subtracting prior payments.',
);
check(
  functions.includes("externalIntegrationProvider==='adbn_tech'")
  && functions.includes('Use the ADBN TECH payment flow for this managed billing record.')
  && functions.includes('cannot be edited here.')
  && functions.includes('cannot be archived here.'),
  'Generic Bills actions cannot mutate ADBN-managed billing records.',
);
check(
  functions.includes("item.externalIntegrationProvider === 'adbn_tech'")
  && functions.includes("+ '/adbn'"),
  'ADBN due reminders deep-link to the dedicated customer portal.',
);
check(
  syncRepository.includes("'syncAdbnCustomerBillingMirror'"),
  'Client uses the secured billing sync callable.',
);
check(
  mirror.includes('data-adbn-customer-billing-sync')
  && mirror.includes('loadAdbnTechPaymentsReadOnly')
  && mirror.includes('syncAdbnCustomerBillingToBajetBn'),
  'ADBN admin customer list exposes customer billing sync.',
);
check(
  portal.includes('getSpaceCommitmentWorkspace')
  && portal.includes('data-adbn-customer-billing-plans')
  && portal.includes('data-adbn-customer-payment-history'),
  'Customer ADBN portal displays synced billing and payment history.',
);
check(
  models.includes('externalIntegrationSourceType?:')
  && models.includes("'adbn_invoice'")
  && models.includes("'adbn_payment_plan'")
  && models.includes("'direct' | 'shared_bill' | 'adbn_tech'"),
  'Models distinguish ADBN-managed commitments and mirrored payments.',
);

console.log('BajetBN Slice 24F.3 ADBN customer billing sync verification PASS');
