import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(path, 'utf8')
    .replace(/\r\n?/g, '\n');

function check(condition, message) {
  if (!condition) {
    throw new Error('FAIL: ' + message);
  }
  console.log('PASS: ' + message);
}

const health =
  read('src/features/business/AdbnTechIntegrationHealthWorkspace.tsx');
const mirror =
  read('src/features/business/AdbnTechMirrorWorkspace.tsx');

check(
  health.includes('const invoiceHealth =')
  && health.includes('outstandingAmount')
  && health.includes('overdueAmount')
  && health.includes('invoice.nextDueDate')
  && health.includes('invoice.dueDate'),
  'Integration Health derives receivables from the current ADBN invoice mirror.',
);

check(
  health.includes('data-adbn-receivables-health-summary')
  && health.includes('invoiceHealth.outstanding')
  && health.includes('invoiceHealth.overdue')
  && health.includes('Unpaid {invoiceHealth.unpaid}')
  && health.includes('Partially paid {invoiceHealth.partial}'),
  'Integration Health shows outstanding, overdue and payment-state receivables.',
);

check(
  health.includes('data-adbn-receivables-open-outstanding')
  && health.includes('data-adbn-receivables-open-overdue')
  && health.includes("openInvoices(")
  && health.includes("'outstanding'")
  && health.includes("'overdue'"),
  'Receivables summary can jump directly into outstanding or overdue invoices.',
);

check(
  health.includes('bajetbn:adbn-invoice-view-filter')
  && mirror.includes('bajetbn:adbn-invoice-view-filter'),
  'Integration Health and invoice workspace share the same one-time filter contract.',
);

check(
  mirror.includes('requestedInvoiceView')
  && /requestedInvoiceView\s*===\s*'outstanding'/.test(mirror)
  && mirror.includes("setInvoicePaymentFilter(")
  && mirror.includes("'outstanding'")
  && mirror.includes("setInvoiceDateFilter(")
  && mirror.includes("'overdue'"),
  'Invoice workspace applies the requested outstanding or overdue quick filter.',
);

check(
  mirror.includes('window.sessionStorage.removeItem')
  && mirror.includes('INVOICE_VIEW_FILTER_SESSION_KEY'),
  'Invoice review hint is removed after it is consumed.',
);

check(
  mirror.includes('data-adbn-tech-invoice-quick-filters')
  && mirror.includes('visibleInvoiceOutstanding'),
  'Receivables jump reuses the existing invoice filter and balance UI.',
);

check(
  !health.includes('setDoc(')
  && !health.includes('updateDoc(')
  && !health.includes('deleteDoc('),
  'Receivables Health adds no ADBN write path.',
);

console.log(
  'BajetBN ADBN TECH receivables health verification PASS',
);
