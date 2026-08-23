export const BAJETBN_SUBSCRIPTION_ADMIN_EMAIL = 'zardeerwandy@gmail.com';

export const BAJETBN_PLUS_PRICES = {
  monthly: { label: '1 Month', amountBnd: 4.90 },
  threeMonths: { label: '3 Months', amountBnd: 13 },
  sixMonths: { label: '6 Months', amountBnd: 25 },
  yearly: { label: '1 Year', amountBnd: 45 },
} as const;

export const BAJETBN_BASIC_SPACE_SUMMARY = [
  '1 Household Space',
  '1 Trip Space',
  '1 SME Space',
] as const;

export const BAJETBN_WHATSAPP_NUMBER =
  String(
    import.meta.env.VITE_BAJETBN_WHATSAPP_NUMBER || '',
  ).replace(/\D/g, '');
