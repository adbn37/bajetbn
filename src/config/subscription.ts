export const BAJETBN_SUBSCRIPTION_ADMIN_EMAIL =
  'zardeerwandy@gmail.com';

export const BAJETBN_PLUS_PRICES = {
  monthly: {
    key: 'monthly',
    label: '1 Month',
    months: 1,
    amountBnd: 4.90,
  },
  threeMonths: {
    key: 'threeMonths',
    label: '3 Months',
    months: 3,
    amountBnd: 13,
  },
  sixMonths: {
    key: 'sixMonths',
    label: '6 Months',
    months: 6,
    amountBnd: 24,
  },
  yearly: {
    key: 'yearly',
    label: '12 Months',
    months: 12,
    amountBnd: 42,
  },
} as const;

export type BajetBnPlusPlan =
  (typeof BAJETBN_PLUS_PRICES)[keyof typeof BAJETBN_PLUS_PRICES];

export const BAJETBN_BASIC_SPACE_SUMMARY = [
  '1 Household Space',
  '1 Trip Space',
  '1 SME Space',
] as const;

export const BAJETBN_PAYMENT_ACCOUNTS = [
  {
    bank: 'BIBD',
    accountNumber: '00008010010398',
  },
  {
    bank: 'Baiduri',
    accountNumber: '0300117741370',
  },
] as const;

export const BAJETBN_WHATSAPP_NUMBER =
  '6737173791';
