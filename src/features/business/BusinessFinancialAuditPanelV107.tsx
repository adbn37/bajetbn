import { useMemo } from 'react';
import type { FinancialTransaction } from '../../types/models';
import { formatMoney } from '../../utils/money';
import { auditBusinessTransactionsV107 } from '../../services/businessFinancialAuditV107';

type Props = {
  transactions: readonly FinancialTransaction[];
  currency: string;
  currentMonth: string;
  dashboardAllTimeNet: number;
  dashboardMonthNet: number;
};

/** Owner/manager Business Home only. Uses existing fetched records, no new queries or writes. */
export function BusinessFinancialAuditPanelV107({ transactions, currency, currentMonth, dashboardAllTimeNet, dashboardMonthNet }: Props) {
  const audit = useMemo(() => auditBusinessTransactionsV107(transactions, currency, currentMonth), [transactions, currency, currentMonth]);
  const discrepancy = audit.allTime.net !== dashboardAllTimeNet || audit.month.net !== dashboardMonthNet;
  const flags = [
    ...(audit.excludedCurrencies.length ? ['Other currencies excluded from BND-equivalent totals; no FX conversion applied'] : []),
    ...(audit.invalidAmounts ? [`${audit.invalidAmounts} invalid amount(s) excluded from the audit`] : []),
    ...(audit.invalidDates ? [`${audit.invalidDates} invalid date(s) detected`] : []),
    ...(audit.duplicateTransactionIds.length ? [`${audit.duplicateTransactionIds.length} repeated transaction ID(s) detected`] : []),
    ...(audit.possiblyRepeatedInvoicePaymentIds.length ? [`${audit.possiblyRepeatedInvoicePaymentIds.length} invoice payment ID(s) appear on multiple posted money records; inspect before treating as duplicates`] : []),
    ...(audit.conflictingReversedFlags ? [`${audit.conflictingReversedFlags} posted row(s) also have reversedBy; inspect reversal status`] : []),
  ];
  const fm = (v: number) => formatMoney(v, currency);
  return (
    <details className="business-audit-v107" data-business-audit-v107>
      <summary>Financial accuracy audit <span>{discrepancy ? 'Review difference' : flags.length ? `${flags.length} item(s) to review` : 'Balanced'}</span></summary>
      <div className="business-audit-v107-body">
        <p>Read-only review of this Business Space's fetched transactions. No transactions or balances are changed. Not an account balance, invoice receivables report or a POS sales report.</p>
        <div className="business-audit-v107-grid">
          <div><small>All-time money in</small><strong>{fm(audit.allTime.income)}</strong></div>
          <div><small>All-time money out</small><strong>{fm(audit.allTime.expense)}</strong></div>
          <div><small>All-time net</small><strong>{fm(audit.allTime.net)}</strong></div>
          <div><small>Current month net</small><strong>{fm(audit.month.net)}</strong></div>
          <div><small>Other dates net</small><strong>{fm(audit.otherDates.net)}</strong></div>
          <div><small>Posted money rows</small><strong>{audit.allTime.count}</strong></div>
        </div>
        <p className={discrepancy ? 'business-audit-v107-alert' : 'business-audit-v107-balanced'}>
          {discrepancy ? `Mismatch with dashboard: audit ${fm(audit.allTime.net)} all-time / ${fm(audit.month.net)} month; dashboard ${fm(dashboardAllTimeNet)} all-time / ${fm(dashboardMonthNet)} month.` : `Reconciled: ${fm(audit.month.net)} (this month) + ${fm(audit.otherDates.net)} (other dates) = ${fm(audit.allTime.net)} (all time).`}
        </p>
        <p>Not counted: {audit.excludedTransfers} transfer(s), {audit.excludedReversals} reversal event(s), {audit.excludedStatuses} non-posted row(s). These are excluded from income-minus-expense totals, not treated as extra income or expenses.</p>
        {flags.length > 0 && <div className="business-audit-v107-warnings"><strong>Review items</strong><ul>{flags.map((flag) => <li key={flag}>{flag}</li>)}</ul></div>}
        {audit.excludedCurrencies.length > 0 && <div><strong>Other currencies (not converted)</strong><ul>{audit.excludedCurrencies.map((item) => <li key={item.currency}>{item.currency}: {item.count} posted row(s), net {item.net} minor units</li>)}</ul></div>}
        {audit.monthlyBreakdown.length > 0 && <div className="business-audit-v107-months"><strong>Month-by-month ledger reconciliation ({currency})</strong><div className="business-audit-v107-scroll"><table><thead><tr><th>Month</th><th>Money in</th><th>Money out</th><th>Net</th><th>Rows</th></tr></thead><tbody>{audit.monthlyBreakdown.map(({ month, totals }) => <tr key={month}><td>{month}</td><td>{fm(totals.income)}</td><td>{fm(totals.expense)}</td><td>{fm(totals.net)}</td><td>{totals.count}</td></tr>)}</tbody></table></div></div>}
        <small>Potential repeated invoice links are warnings, not confirmed double payments. Compare with invoice and bank records before making corrections.</small>
      </div>
    </details>
  );
}
