import type { PaymentMethodCode, SmePosPaymentAccount } from '../types/models';
import type { SmePosPaymentInput } from '../repositories/smePosRepository';
import { formatMoney, toMinorUnits } from '../utils/money';

export interface SmePosPaymentDraft {
  id: string;
  accountId: string;
  paymentMethod: PaymentMethodCode;
  paymentMethodLabel: string;
  amount: string;
}

const paymentMethods: Array<{ code: PaymentMethodCode; label: string }> = [
  { code: 'cash', label: 'Cash' },
  { code: 'bank_transfer', label: 'Bank transfer' },
  { code: 'debit_card', label: 'Debit card' },
  { code: 'credit_card', label: 'Credit card' },
  { code: 'e_wallet', label: 'E-wallet' },
  { code: 'qr_payment', label: 'QR payment' },
  { code: 'other', label: 'Other' },
];

export function createSmePosPaymentDraft(accountId = '', amountMinor = 0): SmePosPaymentDraft {
  return {
    id: crypto.randomUUID(),
    accountId,
    paymentMethod: 'cash',
    paymentMethodLabel: '',
    amount: (Math.max(0, amountMinor) / 100).toFixed(2),
  };
}

export function paymentDraftTotalMinor(rows: SmePosPaymentDraft[]) {
  return rows.reduce((sum, row) => {
    try { return sum + Math.max(0, toMinorUnits(row.amount || '0')); } catch { return sum; }
  }, 0);
}

export function paymentDraftsToInput(rows: SmePosPaymentDraft[]): SmePosPaymentInput[] {
  return rows.map((row) => ({
    accountId: row.accountId,
    paymentMethod: row.paymentMethod,
    paymentMethodLabel: row.paymentMethod === 'other' ? row.paymentMethodLabel.trim() || null : null,
    amountMinor: Math.max(0, toMinorUnits(row.amount || '0')),
  }));
}

interface Props {
  accounts: SmePosPaymentAccount[];
  currency: string;
  totalMinor: number;
  rows: SmePosPaymentDraft[];
  onChange: (rows: SmePosPaymentDraft[]) => void;
  disabled?: boolean;
  label?: string;
  allowZeroTotal?: boolean;
  accountLabel?: string;
}

export function SmePosPaymentSplitEditor({ accounts, currency, totalMinor, rows, onChange, disabled = false, label = 'Payment', allowZeroTotal = false, accountLabel = 'Received in' }: Props) {
  const paidMinor = paymentDraftTotalMinor(rows);
  const remainingMinor = totalMinor - paidMinor;

  function update(id: string, patch: Partial<SmePosPaymentDraft>) {
    onChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addSplit() {
    const nextAmount = Math.max(0, remainingMinor);
    onChange([...rows, createSmePosPaymentDraft('', nextAmount)]);
  }

  function removeSplit(id: string) {
    if (rows.length <= 1) return;
    onChange(rows.filter((row) => row.id !== id));
  }

  return <div className="sme-pos-split-payment">
    <div className="panel-heading compact"><div><strong>{label}</strong><small>Use one account, or split the total across multiple payment accounts.</small></div>{rows.length < 4 && <button className="button ghost small" type="button" disabled={disabled} onClick={addSplit}>+ Split payment</button>}</div>
    <div className="sme-pos-payment-rows">
      {rows.map((row, index) => <div className="sme-pos-payment-row" key={row.id}>
        <label>{accountLabel}<select value={row.accountId} disabled={disabled} onChange={(event) => update(row.id, { accountId: event.target.value })} required={!allowZeroTotal || totalMinor > 0}><option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label>
        <label>Method<select value={row.paymentMethod} disabled={disabled} onChange={(event) => update(row.id, { paymentMethod: event.target.value as PaymentMethodCode })}>{paymentMethods.map((method) => <option key={method.code} value={method.code}>{method.label}</option>)}</select></label>
        <label>Amount ({currency})<input inputMode="decimal" value={row.amount} disabled={disabled} onChange={(event) => update(row.id, { amount: event.target.value })} required={!allowZeroTotal || totalMinor > 0} /></label>
        {row.paymentMethod === 'other' && <label className="span-2">Other payment method<input value={row.paymentMethodLabel} disabled={disabled} onChange={(event) => update(row.id, { paymentMethodLabel: event.target.value })} required /></label>}
        {rows.length > 1 && <button className="button ghost danger small sme-pos-payment-remove" type="button" disabled={disabled} onClick={() => removeSplit(row.id)}>Remove</button>}
        {index === 0 && rows.length === 1 && totalMinor > 0 && row.amount !== (totalMinor / 100).toFixed(2) && <button className="button ghost small sme-pos-payment-fill" type="button" disabled={disabled} onClick={() => update(row.id, { amount: (totalMinor / 100).toFixed(2) })}>Use full total</button>}
      </div>)}
    </div>
    <div className={`sme-pos-payment-balance ${remainingMinor === 0 ? 'balanced' : 'unbalanced'}`}>
      <span>Payment entered <strong>{formatMoney(paidMinor, currency)}</strong></span>
      <span>{remainingMinor >= 0 ? 'Remaining' : 'Over by'} <strong>{formatMoney(Math.abs(remainingMinor), currency)}</strong></span>
    </div>
  </div>;
}
