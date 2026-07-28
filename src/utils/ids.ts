export function createClientDisplayId(prefix: string): string {
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${prefix}-${token}`;
}
