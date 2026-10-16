/**
 * Phase 10.6: display-only smart icon resolution for existing transactions.
 * Never writes a stored category icon, merchant, transaction, or ledger amount.
 * Respect meaningful saved icons; local custom image overrides happen in the UI.
 */
import type { FinancialTransaction } from '../types/models';
import { categoryIconAsset } from './categoryIconAssets';

type DisplayTransaction = Pick<FinancialTransaction, 'type'> & Partial<Pick<FinancialTransaction,
  'categoryIcon' | 'category' | 'counterparty' | 'note'>>;

const MATCHES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(electric(?:ity)?|elektrik|power bill|electric bill)\b/i, 'electric'],
  [/\b(water|jkr water|water bill)\b/i, 'water'],
  [/\b(internet|wifi|broadband|fibre|phone|mobile|telco|dst|progresif|imagine)\b/i, 'phone'],
  [/\b(petrol|diesel|fuel|gas station)\b/i, 'fuel'],
  [/\b(grocer(?:y|ies)|supermarket|pasar|marketplace)\b/i, 'groceries'],
  [/\b(food|drinks?|meal|cafe|coffee|restaurant|kopitiam)\b/i, 'food'],
  [/\b(rent|rental|lease|landlord|tenancy)\b/i, 'home'],
  [/\b(car|vehicle|auto|motor|workshop|tyre)\b/i, 'car'],
  [/\b(salary|payroll|wages?|allowance|paycheck)\b/i, 'salary'],
  [/\b(invoice|payment receipt|sales receipt)\b/i, 'invoice'],
  [/\b(bill|utilities|utility)\b/i, 'bill'],
  [/\b(adbn|laptop|computer|pc\s*(?:build|repair)|cloud|hosting|server|software)\b/i, 'laptop'],
  [/\b(debt|loan|financ(?:e|ing)|instalment)\b/i, 'coins'],
  [/\b(bank|service fee|bank charge)\b/i, 'bank'],
  [/\b(insurance|takaful)\b/i, 'insurance'],
  [/\b(book|tuition|school|education)\b/i, 'school'],
  [/\b(health|medical|clinic|doctor|hospital)\b/i, 'medical'],
  [/\b(business|supplier|vendor)\b/i, 'briefcase'],
];

/** Named merchants/categories are matched only when no meaningful icon was saved. */
export function inferGenericTransactionIcon(...labels: Array<string | undefined>): string {
  for (const label of labels) {
    const text = (label || '').trim();
    if (!text) continue;
    for (const [test, icon] of MATCHES) {
      if (test.test(text)) return icon;
    }
  }
  return 'dots';
}

export function resolveSmartCategoryIconAsset(item: DisplayTransaction): string {
  const saved = (item.categoryIcon || '').trim();
  if (saved && saved !== 'dots') {
    if (saved === 'transfer') return '/navigation-icons-v104/move.svg';
    if (saved === 'reversal') return '/category-icons-v102/repeat.svg';
    // Unknown saved choices are left for the existing glyph fallback.
    return categoryIconAsset(saved);
  }
  if (item.type === 'transfer') return '/navigation-icons-v104/move.svg';
  if (item.type === 'reversal') return '/category-icons-v102/repeat.svg';
  const icon = inferGenericTransactionIcon(item.category, item.counterparty, item.note);
  return categoryIconAsset(icon);
}

export function businessShortcutIconV106(label: string): string {
  const map: Readonly<Record<string, string>> = {
    'Rent': 'home', 'Invoices': 'invoice', 'Operations': 'equipment',
    'Business Setup': 'tools', 'POS': 'shop', 'Open Register': 'cash',
    'Customers': 'staff', 'View Customers': 'staff',
    'Bookings': 'calendar', 'My Sales': 'chart',
    'Listings & Stock': 'inventory', 'Products & Stock': 'inventory',
    'View Listings': 'inventory', 'View Products': 'inventory',
    'My Balance': 'wallet', 'My Reports': 'chart',
  };
  return categoryIconAsset(map[label] || 'briefcase');
}

export function businessActivityFallbackIconV106(tone: string): string {
  return categoryIconAsset(tone === 'document' ? 'invoice'
    : tone === 'warning' ? 'bill'
      : tone === 'income' ? 'wallet'
        : tone === 'expense' ? 'bill' : 'dots');
}
