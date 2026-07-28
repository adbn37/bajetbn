export function toMinorUnits(value: string): number {
  const normalized = value.trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error('Enter a valid amount with up to two decimal places.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const sign = whole.startsWith('-') ? -1 : 1;
  const absoluteWhole = whole.replace('-', '');
  return sign * (Number(absoluteWhole) * 100 + Number(fraction.padEnd(2, '0')));
}

export function formatMoney(minor: number, currency = 'BND'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}
