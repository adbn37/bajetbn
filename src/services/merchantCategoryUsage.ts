/**
 * Optional on-device expense merchant-to-category suggestions.
 * Never sync to Firestore and never change a transaction automatically.
 * Stores normalized payee text + category IDs only (no amounts/account details).
 */
import type { SmartCategoryScope } from './smartCategoryUsage';

type MerchantUsage = {
  merchant: string;
  categoryId: string;
  count: number;
  lastUsedAt: number;
};

const PREFIX = 'bajetbn.merchantCategories.v12.1.';
const MAX_SAVED = 80;

function key(userId: string, scope: SmartCategoryScope): string {
  return PREFIX + encodeURIComponent(userId) + '.' + scope;
}

export function normalizeMerchant(value: string): string {
  const normalized = value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  // Avoid saving free-form emails, numbers and obvious telephone identifiers.
  if (normalized.length < 2 || normalized.length > 80 || /[@]|\d{6,}/.test(normalized)) return '';
  if (!/[\p{L}]/u.test(normalized)) return '';
  return normalized;
}

export function readMerchantCategoryUsage(userId: string, scope: SmartCategoryScope): MerchantUsage[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key(userId, scope)) || '[]');
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter((entry): entry is MerchantUsage => Boolean(
      entry && typeof entry === 'object'
      && typeof entry.merchant === 'string'
      && normalizeMerchant(entry.merchant) === entry.merchant
      && typeof entry.categoryId === 'string' && entry.categoryId.length > 0
      && typeof entry.count === 'number' && Number.isSafeInteger(entry.count) && entry.count > 0
      && typeof entry.lastUsedAt === 'number' && Number.isFinite(entry.lastUsedAt) && entry.lastUsedAt > 0,
    )).filter((entry) => {
      if (seen.has(entry.merchant)) return false;
      seen.add(entry.merchant);
      return true;
    }).slice(0, MAX_SAVED);
  } catch {
    return [];
  }
}

function persist(userId: string, scope: SmartCategoryScope, values: MerchantUsage[]): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key(userId, scope), JSON.stringify(values));
    }
  } catch {
    // Never let local preference storage prevent financial posting.
  }
}

export function recordMerchantCategoryUsage(
  userId: string,
  scope: SmartCategoryScope,
  payee: string,
  categoryId: string,
  now = Date.now(),
): MerchantUsage[] {
  const merchant = normalizeMerchant(payee);
  if (!userId || !merchant || !categoryId) return readMerchantCategoryUsage(userId, scope);
  const previous = readMerchantCategoryUsage(userId, scope);
  const existing = previous.find((item) => item.merchant === merchant);
  const next: MerchantUsage[] = [{
    merchant,
    categoryId,
    count: existing?.categoryId === categoryId ? Math.min(existing.count + 1, 1000000) : 1,
    lastUsedAt: Number.isFinite(now) && now > 0 ? now : Date.now(),
  }, ...previous.filter((item) => item.merchant !== merchant)].slice(0, MAX_SAVED);
  persist(userId, scope, next);
  return next;
}

export function forgetMerchantCategoryUsage(
  userId: string,
  scope: SmartCategoryScope,
  payee: string,
): MerchantUsage[] {
  const merchant = normalizeMerchant(payee);
  const next = readMerchantCategoryUsage(userId, scope).filter((item) => item.merchant !== merchant);
  if (userId && merchant) persist(userId, scope, next);
  return next;
}

export function findMerchantCategorySuggestion<T extends { id: string }>(
  availableCategories: readonly T[],
  usage: readonly MerchantUsage[],
  payee: string,
): T | null {
  const merchant = normalizeMerchant(payee);
  if (!merchant) return null;
  const savedCategoryId = usage.find((item) => item.merchant === merchant)?.categoryId;
  return availableCategories.find((item) => item.id === savedCategoryId) || null;
}
