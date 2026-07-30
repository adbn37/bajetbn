import type { CategoryKind, CategoryScope, TransactionCategory } from '../../types/models';

export const CATEGORY_COLORS = ['teal', 'blue', 'violet', 'amber', 'rose', 'green', 'slate'] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const CATEGORY_ICONS = [
  'wallet', 'briefcase', 'gift', 'shop', 'laptop', 'home', 'food', 'cart', 'fuel', 'car',
  'bus', 'bill', 'phone', 'school', 'health', 'family', 'heart', 'bag', 'game', 'repeat',
  'tools', 'staff', 'building', 'bank', 'plane', 'dots',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

const defaults: Array<Omit<TransactionCategory, 'ownerId' | 'createdAt' | 'updatedAt' | 'archivedAt'>> = [
  { id: 'income-salary', name: 'Salary', kind: 'income', scope: 'personal', icon: 'wallet', color: 'teal', isSystem: true },
  { id: 'income-allowance', name: 'Allowance', kind: 'income', scope: 'personal', icon: 'gift', color: 'blue', isSystem: true },
  { id: 'income-bonus', name: 'Bonus', kind: 'income', scope: 'personal', icon: 'gift', color: 'violet', isSystem: true },
  { id: 'income-freelance', name: 'Freelance', kind: 'income', scope: 'both', icon: 'laptop', color: 'blue', isSystem: true },
  { id: 'income-rental', name: 'Rental income', kind: 'income', scope: 'both', icon: 'home', color: 'green', isSystem: true },
  { id: 'income-sales', name: 'Sales', kind: 'income', scope: 'business', icon: 'shop', color: 'teal', isSystem: true },
  { id: 'income-service', name: 'Service income', kind: 'income', scope: 'business', icon: 'briefcase', color: 'green', isSystem: true },
  { id: 'income-other', name: 'Other income', kind: 'income', scope: 'both', icon: 'dots', color: 'slate', isSystem: true },

  { id: 'expense-food', name: 'Food & drinks', kind: 'expense', scope: 'personal', icon: 'food', color: 'amber', isSystem: true },
  { id: 'expense-groceries', name: 'Groceries', kind: 'expense', scope: 'personal', icon: 'cart', color: 'green', isSystem: true },
  { id: 'expense-fuel', name: 'Fuel', kind: 'expense', scope: 'both', icon: 'fuel', color: 'rose', isSystem: true },
  { id: 'expense-vehicle', name: 'Vehicle', kind: 'expense', scope: 'both', icon: 'car', color: 'blue', isSystem: true },
  { id: 'expense-transport', name: 'Public transport', kind: 'expense', scope: 'personal', icon: 'bus', color: 'blue', isSystem: true },
  { id: 'expense-utilities', name: 'Utilities', kind: 'expense', scope: 'both', icon: 'bill', color: 'amber', isSystem: true },
  { id: 'expense-phone', name: 'Phone & internet', kind: 'expense', scope: 'both', icon: 'phone', color: 'violet', isSystem: true },
  { id: 'expense-rent', name: 'Rent & housing', kind: 'expense', scope: 'both', icon: 'home', color: 'rose', isSystem: true },
  { id: 'expense-education', name: 'Education', kind: 'expense', scope: 'personal', icon: 'school', color: 'blue', isSystem: true },
  { id: 'expense-health', name: 'Health', kind: 'expense', scope: 'personal', icon: 'health', color: 'green', isSystem: true },
  { id: 'expense-family', name: 'Family', kind: 'expense', scope: 'personal', icon: 'family', color: 'violet', isSystem: true },
  { id: 'expense-charity', name: 'Zakat & charity', kind: 'expense', scope: 'personal', icon: 'heart', color: 'green', isSystem: true },
  { id: 'expense-shopping', name: 'Shopping', kind: 'expense', scope: 'personal', icon: 'bag', color: 'rose', isSystem: true },
  { id: 'expense-entertainment', name: 'Entertainment', kind: 'expense', scope: 'personal', icon: 'game', color: 'violet', isSystem: true },
  { id: 'expense-subscriptions', name: 'Subscriptions', kind: 'expense', scope: 'both', icon: 'repeat', color: 'slate', isSystem: true },
  { id: 'expense-supplies', name: 'Business supplies', kind: 'expense', scope: 'business', icon: 'tools', color: 'amber', isSystem: true },
  { id: 'expense-supplier', name: 'Supplier purchase', kind: 'expense', scope: 'business', icon: 'cart', color: 'rose', isSystem: true },
  { id: 'expense-wages', name: 'Staff wages', kind: 'expense', scope: 'business', icon: 'staff', color: 'teal', isSystem: true },
  { id: 'expense-government', name: 'Government fees', kind: 'expense', scope: 'business', icon: 'building', color: 'blue', isSystem: true },
  { id: 'expense-bank', name: 'Bank fees', kind: 'expense', scope: 'both', icon: 'bank', color: 'slate', isSystem: true },
  { id: 'expense-travel', name: 'Travel', kind: 'expense', scope: 'both', icon: 'plane', color: 'blue', isSystem: true },
  { id: 'expense-other', name: 'Other expense', kind: 'expense', scope: 'both', icon: 'dots', color: 'slate', isSystem: true },
];

export const DEFAULT_TRANSACTION_CATEGORIES: TransactionCategory[] = defaults.map((category) => ({
  ...category,
  ownerId: null,
  archivedAt: null,
}));

export function categoryApplies(category: TransactionCategory, kind: CategoryKind, scope: Exclude<CategoryScope, 'both'>) {
  return category.kind === kind && (category.scope === scope || category.scope === 'both');
}

export function categoryIconGlyph(icon: string): string {
  const glyphs: Record<string, string> = {
    wallet: '▣', briefcase: '▤', gift: '◆', shop: '▥', laptop: '⌨', home: '⌂', food: '◉', cart: '▧', fuel: '◒', car: '▰',
    bus: '▦', bill: '≣', phone: '▯', school: '△', health: '+', family: '●', heart: '♥', bag: '▱', game: '◇', repeat: '↻',
    tools: '⚒', staff: '♟', building: '▥', bank: '▣', plane: '✈', dots: '•••', transfer: '↔', reversal: '↶',
  };
  return glyphs[icon] || '•';
}
