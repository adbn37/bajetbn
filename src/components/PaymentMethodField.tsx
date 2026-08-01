import { PAYMENT_METHODS } from '../config/bruneiMoneyOptions';
import type { PaymentMethodCode } from '../types/models';

export function PaymentMethodField({
  value,
  customLabel,
  onChange,
  label = 'Payment method',
  hint,
  className,
}: {
  value: PaymentMethodCode;
  customLabel: string;
  onChange: (value: PaymentMethodCode, customLabel: string) => void;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const selected = PAYMENT_METHODS.find((item) => item.code === value);
  return <label className={className}>{label}
    <select value={value} onChange={(event) => onChange(event.target.value as PaymentMethodCode, event.target.value === 'other' ? customLabel : '')}>
      {PAYMENT_METHODS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
    </select>
    {value === 'other' && <input required value={customLabel} onChange={(event) => onChange(value, event.target.value)} maxLength={80} placeholder="Type the payment method" />}
    <small>{hint || selected?.description}</small>
  </label>;
}
