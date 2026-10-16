/**
 * Phase 10.5: Home activity artwork matches the transaction-list icon precedence.
 * This lightweight component preserves the existing lazy-loaded Add Money flow
 * without importing the heavy transaction feature.
 */
import { useEffect, useState } from 'react';
import type { FinancialTransaction } from '../types/models';
import { categoryIconGlyph } from '../features/categories/defaultCategories';
import { resolveSmartCategoryIconAsset } from '../services/smartCategoryIconV106';
import { CATEGORY_VISUAL_EVENT, getCategoryCustomIcon } from '../services/categoryVisualPreferences';

type Props = {
  transaction: FinancialTransaction;
  ownerId: string;
};

export function RecentActivityIcon({ transaction, ownerId }: Props) {
  const categoryId = transaction.categoryId || '';
  const [customIcon, setCustomIcon] = useState(() => getCategoryCustomIcon(ownerId, categoryId));

  useEffect(() => {
    const update = () => setCustomIcon(getCategoryCustomIcon(ownerId, categoryId));
    update();
    window.addEventListener(CATEGORY_VISUAL_EVENT, update);
    return () => window.removeEventListener(CATEGORY_VISUAL_EVENT, update);
  }, [ownerId, categoryId]);

  const key = transaction.categoryIcon || (
    transaction.type === 'transfer' ? 'transfer'
      : transaction.type === 'reversal' ? 'reversal'
        : transaction.type === 'income' ? 'wallet' : 'dots'
  );
  const src = resolveSmartCategoryIconAsset(transaction);

  return (
    <span
      className={`home-v110-activity-icon ${transaction.type} category-${transaction.categoryColor || 'slate'} bajetbn-v105-activity-art`}
      aria-hidden="true"
    >
      {customIcon ? (
        <img className="bajetbn-v105-activity-custom" src={customIcon} alt="" />
      ) : src ? (
        <img className="bajetbn-v105-activity-vector" src={src} alt="" loading="lazy" decoding="async" />
      ) : (
        categoryIconGlyph(key)
      )}
    </span>
  );
}
