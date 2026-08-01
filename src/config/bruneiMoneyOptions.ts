import type { Account, AccountType, InstitutionCode, PaymentMethodCode } from '../types/models';

export interface InstitutionOption {
  code: InstitutionCode;
  label: string;
  shortLabel: string;
  accountTypes: AccountType[];
  keywords: string[];
}

export interface PaymentMethodOption {
  code: PaymentMethodCode;
  label: string;
  description: string;
}

export const BRUNEI_INSTITUTIONS: InstitutionOption[] = [
  { code: 'bibd', label: 'Bank Islam Brunei Darussalam (BIBD)', shortLabel: 'BIBD', accountTypes: ['bank', 'credit_card'], keywords: ['bank islam brunei darussalam'] },
  { code: 'baiduri', label: 'Baiduri Bank', shortLabel: 'Baiduri', accountTypes: ['bank', 'credit_card'], keywords: ['baiduri'] },
  { code: 'taib', label: 'Perbadanan TAIB', shortLabel: 'TAIB', accountTypes: ['bank'], keywords: ['tabung amanah islam brunei'] },
  { code: 'standard_chartered_brunei', label: 'Standard Chartered Brunei', shortLabel: 'Standard Chartered', accountTypes: ['bank', 'credit_card'], keywords: ['scb', 'standard chartered bank'] },
  { code: 'cash', label: 'Cash', shortLabel: 'Cash', accountTypes: ['cash'], keywords: ['wallet', 'petty cash'] },
  { code: 'other_e_wallet', label: 'Other e-wallet', shortLabel: 'E-wallet', accountTypes: ['e_wallet'], keywords: ['digital wallet'] },
  { code: 'other', label: 'Other institution or provider', shortLabel: 'Other', accountTypes: ['bank', 'cash', 'e_wallet', 'credit_card'], keywords: [] },
];

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { code: 'bank_transfer', label: 'Bank transfer', description: 'Online or mobile bank transfer.' },
  { code: 'cash', label: 'Cash', description: 'Paid using physical cash.' },
  { code: 'debit_card', label: 'Debit card', description: 'Paid using a bank debit card.' },
  { code: 'credit_card', label: 'Credit card', description: 'Paid using a credit card.' },
  { code: 'e_wallet', label: 'E-wallet', description: 'Paid using a digital wallet.' },
  { code: 'qr_payment', label: 'QR payment', description: 'Paid by scanning or showing a payment QR.' },
  { code: 'bank_deposit', label: 'Bank counter or ATM deposit', description: 'Cash or cheque deposited into a bank account.' },
  { code: 'cheque', label: 'Cheque', description: 'Paid using a cheque.' },
  { code: 'other', label: 'Other method', description: 'Type a different payment method.' },
];

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function institutionOptionsForType(type: AccountType) {
  return BRUNEI_INSTITUTIONS.filter((item) => item.accountTypes.includes(type));
}

export function institutionCodeForLabel(value: string): InstitutionCode | null {
  const candidate = normalized(value);
  if (!candidate) return null;
  const exact = BRUNEI_INSTITUTIONS.find((item) => [item.label, item.shortLabel, ...item.keywords].some((label) => normalized(label) === candidate));
  return exact?.code || 'other';
}

export function institutionDisplay(account: Pick<Account, 'institution' | 'institutionCode' | 'type'>) {
  if (account.institution?.trim()) return account.institution.trim();
  if (account.institutionCode) return BRUNEI_INSTITUTIONS.find((item) => item.code === account.institutionCode)?.shortLabel || 'Other';
  if (account.type === 'cash') return 'Cash';
  if (account.type === 'e_wallet') return 'E-wallet';
  if (account.type === 'credit_card') return 'Credit card';
  return 'Bank';
}

export function paymentMethodLabel(code?: PaymentMethodCode | null, customLabel?: string | null) {
  if (code === 'other' && customLabel?.trim()) return customLabel.trim();
  return PAYMENT_METHODS.find((item) => item.code === code)?.label || 'Not recorded';
}

export function suggestedPaymentMethod(account?: Pick<Account, 'type'> | null): PaymentMethodCode {
  if (account?.type === 'cash') return 'cash';
  if (account?.type === 'e_wallet') return 'e_wallet';
  if (account?.type === 'credit_card') return 'credit_card';
  return 'bank_transfer';
}
