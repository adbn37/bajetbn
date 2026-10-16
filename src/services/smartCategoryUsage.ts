/**
 * Phase 10.1: optional, device-local category usage preferences.
 * This does NOT write to Firestore or influence posting/ledger calculations.
 * Only category IDs and counts are stored, per user, type and scope.
 */
export type SmartCategoryKind = 'income' | 'expense';
export type SmartCategoryScope = 'personal' | 'business';

export interface SmartCategoryUsage {
  categoryId: string;
  count: number;
  lastUsedAt: number;
}

const PREFIX = 'bajetbn.smartCategories.v10.';
const MAX_SAVED = 80;

function key(userId: string, kind: SmartCategoryKind, scope: SmartCategoryScope): string {
  return PREFIX + encodeURIComponent(userId) + '.' + kind + '.' + scope;
}

export function readSmartCategoryUsage(
  userId: string,
  kind: SmartCategoryKind,
  scope: SmartCategoryScope,
): SmartCategoryUsage[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key(userId, kind, scope)) || '[]');
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value
      .filter((item): item is SmartCategoryUsage => Boolean(
        item && typeof item === 'object'
        && typeof item.categoryId === 'string'
        && item.categoryId.length > 0
        && typeof item.count === 'number' && Number.isSafeInteger(item.count) && item.count > 0
        && typeof item.lastUsedAt === 'number' && Number.isFinite(item.lastUsedAt) && item.lastUsedAt > 0,
      ))
      .filter((item) => {
        if (seen.has(item.categoryId)) return false;
        seen.add(item.categoryId);
        return true;
      })
      .slice(0, MAX_SAVED);
  } catch {
    return [];
  }
}

export function recordSmartCategoryUsage(
  userId: string,
  kind: SmartCategoryKind,
  scope: SmartCategoryScope,
  categoryId: string,
  now = Date.now(),
): SmartCategoryUsage[] {
  if (!userId || !categoryId) return [];
  const before = readSmartCategoryUsage(userId, kind, scope);
  const previous = before.find((item) => item.categoryId === categoryId);
  const next = [
    {
      categoryId,
      count: Math.min(MAX_SAVED * 1000000, (previous?.count || 0) + 1),
      lastUsedAt: Number.isFinite(now) && now > 0 ? now : Date.now(),
    },
    ...before.filter((item) => item.categoryId !== categoryId),
  ].slice(0, MAX_SAVED);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key(userId, kind, scope), JSON.stringify(next));
    }
  } catch {
    // Browsers that block storage must not prevent a financial transaction from saving.
  }
  return next;
}

export function smartCategorySuggestions<T extends { id: string }>(
  options: readonly T[],
  usage: readonly SmartCategoryUsage[],
  maxItems = 4,
): { recent: T[]; frequent: T[] } {
  const available = new Map(options.map((category) => [category.id, category]));
  const valid = usage.filter((item) => available.has(item.categoryId));
  const recent = [...valid]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, maxItems)
    .map((item) => available.get(item.categoryId)!) ;
  // Frequent is based on actual repeat use, not merely being one of the oldest recent picks.
  // A category can appear in both lists if it is both new and often used.
  const frequent = [...valid]
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
    .slice(0, maxItems)
    .map((item) => available.get(item.categoryId)!);
  return { recent, frequent };
}
