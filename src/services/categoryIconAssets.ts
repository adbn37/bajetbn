/** Phase 10.2 original neon-glass SVG vector icon pack. Public static assets (no data migration). */
export const BAJETBN_NEON_CATEGORY_ICONS = [
  'wallet', 'briefcase', 'gift', 'shop', 'laptop', 'home', 'food',
  'cart', 'fuel', 'car', 'bus', 'bill', 'phone', 'school',
  'health', 'family', 'heart', 'bag', 'game', 'repeat', 'tools',
  'staff', 'building', 'bank', 'plane', 'dots', 'cash', 'coins',
  'card', 'savings', 'investment', 'chart', 'calendar', 'receipt', 'target',
  'piggy', 'coffee', 'restaurant', 'groceries', 'supermarket', 'delivery', 'train',
  'taxi', 'parking', 'toll', 'maintenance', 'insurance', 'mortgage', 'furniture',
  'laundry', 'electric', 'water', 'wifi', 'mobile', 'medical', 'dental',
  'pharmacy', 'fitness', 'tuition', 'books', 'childcare', 'pets', 'donation',
  'wedding', 'clothes', 'shoes', 'beauty', 'movie', 'music', 'streaming',
  'subscription', 'salary', 'bonus', 'freelance', 'invoice', 'tax', 'marketing',
  'shipping', 'warehouse', 'inventory', 'equipment', 'payroll', 'security', 'cloud',
] as const;
const names: ReadonlySet<string> = new Set(BAJETBN_NEON_CATEGORY_ICONS);
export function categoryIconAsset(icon: string): string {
  return names.has(icon) ? `/category-icons-v102/${icon}.svg` : '';
}
