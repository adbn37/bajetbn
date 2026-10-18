/** Phase 10.7: read-only diagnostic calculations. Never posts/edits transactions. */
import type { FinancialTransaction } from '../types/models';

export type AuditTotals = { income: number; expense: number; net: number; count: number };
export type BusinessAuditV107 = {
  primaryCurrency: string;
  allTime: AuditTotals;
  month: AuditTotals;
  otherDates: AuditTotals;
  monthlyBreakdown: Array<{ month: string; totals: AuditTotals }>;
  excludedCurrencies: Array<{ currency: string; count: number; net: number }>;
  excludedTransfers: number;
  excludedReversals: number;
  excludedStatuses: number;
  invalidAmounts: number;
  invalidDates: number;
  duplicateTransactionIds: string[];
  possiblyRepeatedInvoicePaymentIds: string[];
  conflictingReversedFlags: number;
};

const empty = (): AuditTotals => ({ income: 0, expense: 0, net: 0, count: 0 });
function add(totals: AuditTotals, row: FinancialTransaction) {
  if (row.type === 'income') totals.income += row.amountMinor;
  else if (row.type === 'expense') totals.expense += row.amountMinor;
  totals.net = totals.income - totals.expense;
  totals.count += 1;
}

export function bruneiMonthV107(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', timeZone: 'Asia/Brunei' }).formatToParts(date);
  const y = parts.find((item) => item.type === 'year')?.value;
  const m = parts.find((item) => item.type === 'month')?.value;
  return `${y}-${m}`;
}

export function auditBusinessTransactionsV107(rows: readonly FinancialTransaction[], primaryCurrency: string, currentMonth: string): BusinessAuditV107 {
  const allTime = empty();
  const month = empty();
  const otherDates = empty();
  const byMonth = new Map<string, AuditTotals>();
  const byOtherCurrency = new Map<string, { currency: string; count: number; net: number }>();
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  const payments = new Map<string, Set<string>>();
  let excludedTransfers = 0;
  let excludedReversals = 0;
  let excludedStatuses = 0;
  let invalidAmounts = 0;
  let invalidDates = 0;
  let conflictingReversedFlags = 0;

  for (const row of rows) {
    if (row.id) {
      if (seenIds.has(row.id)) duplicateIds.add(row.id);
      seenIds.add(row.id);
    }
    if (row.status !== 'posted') { excludedStatuses++; continue; }
    if (row.type === 'reversal') { excludedReversals++; continue; }
    if (row.type === 'transfer') { excludedTransfers++; continue; }
    if (row.type !== 'income' && row.type !== 'expense') continue;
    if (!Number.isSafeInteger(row.amountMinor) || row.amountMinor < 0) { invalidAmounts++; continue; }
    if (row.reversedBy) conflictingReversedFlags++;
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(row.transactionDate || '')) invalidDates++;
    if (row.businessInvoicePaymentId) {
      const id = row.businessInvoicePaymentId;
      if (!payments.has(id)) payments.set(id, new Set());
      payments.get(id)!.add(row.id);
    }
    if (row.currency !== primaryCurrency) {
      const key = row.currency || '(unknown)';
      const entry = byOtherCurrency.get(key) || { currency: key, count: 0, net: 0 };
      entry.count++;
      entry.net += row.type === 'income' ? row.amountMinor : -row.amountMinor;
      byOtherCurrency.set(key, entry);
      continue;
    }
    add(allTime, row);
    const key = (row.transactionDate || '').slice(0, 7);
    const bucket = byMonth.get(key) || empty();
    add(bucket, row);
    byMonth.set(key, bucket);
    if (key === currentMonth) add(month, row);
    else add(otherDates, row);
  }

  return {
    primaryCurrency,
    allTime, month, otherDates,
    monthlyBreakdown: [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([key, totals]) => ({ month: key, totals })),
    excludedCurrencies: [...byOtherCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    excludedTransfers, excludedReversals, excludedStatuses, invalidAmounts, invalidDates,
    duplicateTransactionIds: [...duplicateIds].sort(),
    possiblyRepeatedInvoicePaymentIds: [...payments.entries()].filter(([, ids]) => ids.size > 1).map(([id]) => id).sort(),
    conflictingReversedFlags,
  };
}
