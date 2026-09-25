import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
function check(condition, message) {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('PASS: ' + message);
}

const functions = read('functions/src/index.ts');
const integration = read('src/repositories/adbnTechIntegrationRepository.ts');
const syncRepository = read('src/repositories/adbnCustomerBillingSyncRepository.ts');
const mirror = read('src/features/business/AdbnTechMirrorWorkspace.tsx');
const models = read('src/types/models.ts');
const start = functions.indexOf('export const syncAdbnCustomerBillingMirror');
const block = start >= 0 ? functions.slice(start) : '';

check(
  integration.includes("collection(db, 'paymentPlans')")
  && integration.includes('AdbnTechPaymentPlanMirror')
  && integration.includes('paymentPlans: AdbnTechPaymentPlanMirror[]'),
  'ADBN read-only snapshot includes paymentPlans without requiring invoices.',
);
check(
  integration.includes('data.planId')
  && integration.includes('data.paymentPlanId')
  && integration.includes('plan?.customerId'),
  'Legacy ADBN payments can resolve through planId when invoiceId is absent.',
);
check(
  syncRepository.includes('plans: AdbnTechPaymentPlanMirror[]')
  && syncRepository.includes('planId: item.planId')
  && syncRepository.includes('plans,'),
  'Client sends standalone payment plans and plan-linked payments to the secured sync callable.',
);
check(
  mirror.includes('snapshot.paymentPlans.filter')
  && mirror.includes('planIds.has(payment.planId)')
  && mirror.includes('legacy plan'),
  'ADBN admin billing sync includes standalone legacy plans and their payments.',
);
check(
  block.includes('AdbnBillingPaymentPlanMirrorInput')
  && block.includes("'adbn_payment_plan'")
  && block.includes("'adbn_plan_commitment'"),
  'Server mirrors legacy payment plans as deterministic ADBN-managed instalments.',
);
check(
  block.includes('invoiceById.has(invoiceId)')
  && block.includes('invoiceNos.has(invoiceNo)')
  && block.includes('return null;'),
  'Invoice-backed payment plans are de-duplicated instead of creating a second commitment.',
);
check(
  block.includes('monthlyMinor <= 0')
  && block.includes('derivedTotalMinor <= 0'),
  'Invalid legacy plans are skipped instead of inventing monthly amounts.',
);
check(
  block.includes('const matchesPlan')
  && block.includes('planById.get(payment.planId)')
  && block.includes("'adbn_plan_commitment'"),
  'Plan-linked payment history attaches to the mirrored legacy instalment.',
);
check(
  !block.includes('contractId')
  && !block.includes('contractStatus')
  && !block.includes('requireContract'),
  'Legacy payment-plan sync does not require an ADBN contract.',
);
check(
  !block.includes('updateAccountBalance(')
  && !block.includes('createLedgerEntry(')
  && block.includes('accountId: null'),
  'Legacy plan mirror remains isolated from BajetBN bank accounts and ledgers.',
);
check(
  models.includes("'adbn_payment_plan'"),
  'Commitment model identifies ADBN payment-plan mirrors.',
);

console.log('BajetBN Slice 24F.4 legacy ADBN payment-plan mirror verification PASS');
