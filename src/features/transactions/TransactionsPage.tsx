import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { PaymentMethodField } from '../../components/PaymentMethodField';
import { paymentMethodLabel, suggestedPaymentMethod } from '../../config/bruneiMoneyOptions';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineSync } from '../../contexts/OfflineSyncContext';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DEFAULT_TRANSACTION_CATEGORIES,
  categoryApplies,
  categoryIconGlyph,
} from '../categories/defaultCategories';
import { listAllAccounts } from '../../repositories/accountRepository';
import { reverseSharedBillPayment } from '../../repositories/collaborationRepository';
import { createCategory, listAllCustomCategories, updateCategory } from '../../repositories/categoryRepository';
import { manageCategory } from '../../repositories/lifecycleRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import {
  getTransactionAttachmentUrl,
  listAllTransactionAttachments,
  listTransactionAttachments,
  listTransactions,
  postTransaction,
  removeTransactionAttachment,
  reverseTransaction,
  uploadTransactionAttachment,
  type PostTransactionOutcome,
  type TransactionInput,
} from '../../repositories/transactionRepository';
import type {
  Account,
  CategoryKind,
  CategoryScope,
  FinancialTransaction,
  PaymentMethodCode,
  Space,
  TransactionAttachment,
  TransactionCategory,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

const typeLabels = { income: 'Money in', expense: 'Money out', transfer: 'Move money', reversal: 'Undo' } as const;
const statusLabels = { posted: 'Saved', reversed: 'Undone' } as const;

type PrimaryType = 'income' | 'expense' | 'transfer';
type TypeFilter = 'all' | PrimaryType;
type StatusFilter = 'all' | 'posted' | 'reversed';
type PeriodFilter = 'current_month' | 'all';

function dateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function monthPrefix(timezone: string): string {
  return dateInTimezone(timezone).slice(0, 7);
}

function spaceScope(space?: Space): Exclude<CategoryScope, 'both'> {
  return space?.type === 'sme' ? 'business' : 'personal';
}

function transactionCategorySnapshot(item: FinancialTransaction): TransactionCategory {
  return {
    id: item.categoryId || `legacy-${item.category}`,
    ownerId: null,
    name: item.category || typeLabels[item.type],
    kind: item.originalType === 'income' || item.type === 'income' ? 'income' : 'expense',
    scope: item.categoryScope || 'both',
    icon: item.categoryIcon || (item.type === 'transfer' ? 'transfer' : item.type === 'reversal' ? 'reversal' : 'dots'),
    color: item.categoryColor || 'slate',
    isSystem: !item.categoryId?.startsWith('custom-'),
    archivedAt: null,
  };
}

function accountEffectForPreview(account: Account, type: PrimaryType, amountMinor: number, destination = false): number {
  const flow = type === 'income' || (type === 'transfer' && destination) ? 'in' : 'out';
  const assetEffect = flow === 'in' ? amountMinor : -amountMinor;
  return account.type === 'credit_card' ? -assetEffect : assetEffect;
}

const MAX_TRANSACTION_LABELS = 8;
const MAX_TRANSACTION_LABEL_LENGTH = 32;

function normalizeTransactionLabel(value: string): string {
  return value
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, MAX_TRANSACTION_LABEL_LENGTH);
}

function parseTransactionLabels(value: string): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();

  value.split(',').forEach((part) => {
    const label = normalizeTransactionLabel(part);

    if (!label) return;

    const key = label.toLowerCase();

    if (seen.has(key)) return;

    seen.add(key);
    labels.push(label);
  });

  return labels.slice(0, MAX_TRANSACTION_LABELS);
}

function transactionLabelText(label: string): string {
  return `#${label}`;
}

export function TransactionsPage() {
  const { user, profile } = useAuth();
  const { online, lastCompletedAt } = useOfflineSync();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [customCategories, setCustomCategories] = useState<TransactionCategory[]>([]);
  const [transactionAttachmentCounts, setTransactionAttachmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [receiptTransaction, setReceiptTransaction] = useState<FinancialTransaction | null>(null);
  const [reverseDialog, setReverseDialog] = useState<ActionConfirmState<FinancialTransaction> | null>(null);
  const [reverseBusy, setReverseBusy] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current_month');
  const [spaceFilter, setSpaceFilter] = useState('all');
  const initialAccountFilter = searchParams.get('accountId');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[] | null>(
    initialAccountFilter ? [initialAccountFilter] : null,
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [nextTransactions, nextAccounts, nextSpaces, nextCustomCategories, nextAttachments] = await Promise.all([
        listTransactions(user.uid),
        listAllAccounts(user.uid),
        listSpaces(user.uid),
        listAllCustomCategories(user.uid),
        listAllTransactionAttachments(user.uid),
      ]);
      const nextAttachmentCounts: Record<string, number> = {};
      nextAttachments.forEach((attachment) => {
        nextAttachmentCounts[attachment.transactionId] = (nextAttachmentCounts[attachment.transactionId] || 0) + 1;
      });
      setTransactions(nextTransactions);
      setAccounts(nextAccounts);
      setSpaces(nextSpaces.filter((space) => !space.archivedAt));
      setCustomCategories(nextCustomCategories);
      setTransactionAttachmentCounts(nextAttachmentCounts);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user, lastCompletedAt]);

  const allCategories = useMemo(
    () => [...DEFAULT_TRANSACTION_CATEGORIES, ...customCategories.filter((item) => !item.archivedAt)],
    [customCategories],
  );
  async function refreshCategories(): Promise<TransactionCategory[]> {
    if (!user) return allCategories;
    const nextCustomCategories = await listAllCustomCategories(user.uid);
    setCustomCategories(nextCustomCategories);
    return [...DEFAULT_TRANSACTION_CATEGORIES, ...nextCustomCategories.filter((item) => !item.archivedAt)];
  }
  const categoryMap = useMemo(() => new Map(allCategories.map((category) => [category.id, category])), [allCategories]);
  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const activeAccounts = useMemo(() => accounts.filter((account) => !account.archivedAt && !account.closedAt), [accounts]);
  const spaceMap = useMemo(() => new Map(spaces.map((space) => [space.id, space])), [spaces]);

  const availableLabels = useMemo(() => {
    const byKey = new Map<string, string>();

    transactions.forEach((item) => {
      (item.labels || []).forEach((rawLabel) => {
        const label = normalizeTransactionLabel(rawLabel);

        if (!label) return;

        const key = label.toLowerCase();

        if (!byKey.has(key)) {
          byKey.set(key, label);
        }
      });
    });

    return [...byKey.values()]
      .sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const selectedAccountNames = selectedAccountIds === null
    ? []
    : selectedAccountIds
      .map((accountId) => accountMap.get(accountId)?.name)
      .filter((name): name is string => Boolean(name));

  const accountFilterLabel = selectedAccountIds === null
    ? 'All Accounts'
    : selectedAccountIds.length === 0
      ? 'No Accounts'
      : selectedAccountIds.length === 1
        ? selectedAccountNames[0] || '1 Account'
        : `${selectedAccountIds.length} Accounts`;

  const accountMatchesFilter = (item: FinancialTransaction) => {
    if (selectedAccountIds === null) return true;
    if (selectedAccountIds.length === 0) return false;

    if (selectedAccountIds.includes(item.accountId)) {
      return true;
    }

    return (
      typeof item.destinationAccountId === 'string'
      && selectedAccountIds.includes(item.destinationAccountId)
    );
  };

  const toggleAccountFilter = (accountId: string) => {
    setSelectedAccountIds((current) => {
      if (current === null) {
        return accounts
          .map((account) => account.id)
          .filter((id) => id !== accountId);
      }

      if (current.includes(accountId)) {
        return current.filter((id) => id !== accountId);
      }

      const next = [...current, accountId];

      if (
        accounts.length > 0
        && next.length >= accounts.length
      ) {
        return null;
      }

      return next;
    });
  };

  const currentMonth = monthPrefix(profile?.timezone || 'Asia/Brunei');

  const monthlyPosted = transactions.filter(
    (item) => (
      item.status === 'posted'
      && item.transactionDate.startsWith(currentMonth)
      && accountMatchesFilter(item)
    ),
  );

  const income = monthlyPosted
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amountMinor, 0);

  const expenses = monthlyPosted
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amountMinor, 0);

  const transferCount = monthlyPosted
    .filter((item) => item.type === 'transfer')
    .length;

  const expenseCategorySummary = useMemo(() => {
    const totals = new Map<string, { category: TransactionCategory; amountMinor: number }>();
    monthlyPosted.filter((item) => item.type === 'expense').forEach((item) => {
      const category = item.categoryId ? categoryMap.get(item.categoryId) || transactionCategorySnapshot(item) : transactionCategorySnapshot(item);
      const current = totals.get(category.id);
      totals.set(category.id, { category, amountMinor: (current?.amountMinor || 0) + item.amountMinor });
    });
    return [...totals.values()].sort((a, b) => b.amountMinor - a.amountMinor).slice(0, 5);
  }, [categoryMap, monthlyPosted]);

  const visibleTransactions = transactions.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (periodFilter === 'current_month' && !item.transactionDate.startsWith(currentMonth)) return false;
    if (spaceFilter !== 'all' && item.spaceId !== spaceFilter) return false;
    if (!accountMatchesFilter(item)) return false;
    if (categoryFilter !== 'all' && item.categoryId !== categoryFilter && `legacy-${item.category}` !== categoryFilter) return false;

    if (
      labelFilter !== 'all'
      && !(item.labels || []).some(
        (label) =>
          label.toLowerCase() === labelFilter.toLowerCase(),
      )
    ) {
      return false;
    }

    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    const source = accountMap.get(item.accountId)?.name || '';
    const destination = item.destinationAccountId ? accountMap.get(item.destinationAccountId)?.name || '' : '';
    const method = paymentMethodLabel(item.paymentMethod, item.paymentMethodLabel);
    const space = spaceMap.get(item.spaceId)?.name || '';
    const labels = (item.labels || [])
      .map(transactionLabelText)
      .join(' ');

    return [
      item.displayId,
      item.category,
      item.counterparty,
      item.note,
      source,
      destination,
      space,
      method,
      labels,
    ].some(
      (value) =>
        value?.toLowerCase().includes(needle),
    );
  });

  const updateAttachmentCount = (transactionId: string, count: number) => {
    setTransactionAttachmentCounts((current) => ({ ...current, [transactionId]: count }));
  };

  const askReverse = (item: FinancialTransaction) => {
    setError('');
    setReverseDialog({
      payload: item,
      title: `Undo ${item.displayId}?`,
      description: 'BajetBN will add a correction record instead of changing or deleting the original money record.',
      note: item.sharedBillPaymentId
        ? 'The account balance will be restored and the shared bill will open again.'
        : 'The affected account balance will be restored.',
      confirmLabel: 'Undo money activity',
      tone: 'danger',
    });
  };

  const handleReverse = async () => {
    if (!reverseDialog) return;
    const item = reverseDialog.payload;
    setReverseBusy(true);
    setError('');
    try {
      if (item.sharedBillPaymentId) {
        await reverseSharedBillPayment({
          paymentId: item.sharedBillPaymentId,
          reversalDate: dateInTimezone(profile?.timezone || 'Asia/Brunei'),
          reason: 'Undone from money activity details',
        });
      } else {
        await reverseTransaction(item.id, dateInTimezone(profile?.timezone || 'Asia/Brunei'), 'Undone from money activity details');
      }
      setReverseDialog(null);
      setSelectedTransaction(null);
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setReverseBusy(false);
    }
  };

  return (
    <main className="page">
      <PageHeader
        eyebrow="Money records"
        title="Money activity"
        description="Record money in, money out, and money moved between accounts."
        action={<div className="header-actions">
          <Link className="button secondary" to="/recurring">Recurring money</Link>
          <button className="button secondary" onClick={() => setShowCategoryManager(true)}>Edit categories</button>
          <button className="button primary" onClick={() => setShowForm(true)} disabled={!accounts.length || !spaces.length}>+ Add money activity</button>
        </div>}
      />
      {error && <div className="notice error">{error}</div>}
      {feedback && <div className="notice success">{feedback} {feedback.includes('device') && <Link to="/offline-sync">View Offline & sync</Link>}</div>}
      <div className="info-banner"><strong>Safe account updates</strong><span>Saving money activity updates your account balance. Use Undo when something was entered wrongly.</span></div>

      <section className="transaction-summary">
        <div><span>Money in this month</span><strong className="money-positive">{formatMoney(income, profile?.currency || 'BND')}</strong></div>
        <div><span>Money out this month</span><strong className="money-negative">{formatMoney(expenses, profile?.currency || 'BND')}</strong></div>
        <div><span>Money left this month</span><strong>{formatMoney(income - expenses, profile?.currency || 'BND')}</strong></div>
        <div><span>Money moves this month</span><strong>{transferCount}</strong></div>
      </section>

      <div className="transaction-account-scope" aria-live="polite">
        <span>Account view</span>
        <strong>{accountFilterLabel}</strong>
      </div>

      {expenseCategorySummary.length > 0 && <section className="category-summary-panel">
        <div className="section-heading"><div><span>Where your money went</span><h2>Top categories this month</h2></div><small>{expenseCategorySummary.length} categories</small></div>
        <div className="category-summary-grid">
          {expenseCategorySummary.map(({ category, amountMinor }) => <div className="category-summary-item" key={category.id}>
            <CategoryBadge category={category} />
            <strong>{formatMoney(amountMinor, profile?.currency || 'BND')}</strong>
          </div>)}
        </div>
      </section>}

      {!accounts.length && !loading && <div className="notice">Add an account before recording money.</div>}
      {!spaces.length && !loading && <div className="notice">Add or restore a Space before recording money.</div>}

      <section className="transaction-toolbar transaction-toolbar-expanded">
        <div className="segmented-control" role="group" aria-label="Transaction type filter">
          {(['all', 'income', 'expense', 'transfer'] as const).map((value) => <button key={value} type="button" className={typeFilter === value ? 'active' : ''} onClick={() => setTypeFilter(value)}>{value === 'all' ? 'All' : typeLabels[value]}</button>)}
        </div>
        <input className="transaction-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search category, #label, Space, Account, payee…" />
        <div className="transaction-filter-grid">
          <label>Period<select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}><option value="current_month">This month</option><option value="all">All time</option></select></label>
          <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="all">All statuses</option><option value="posted">Saved</option><option value="reversed">Undone</option></select></label>
          <label>Space<select value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)}><option value="all">All Spaces</option>{spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>
          <div className="transaction-account-filter">
            <span className="transaction-filter-label">Accounts</span>

            <details>
              <summary>{accountFilterLabel}</summary>

              <div className="transaction-account-filter-popover">
                <div className="transaction-account-filter-actions">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountIds(null)}
                  >
                    Select all
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAccountIds([])}
                  >
                    Clear
                  </button>
                </div>

                <div className="transaction-account-filter-options">
                  {accounts.map((account) => {
                    const checked = selectedAccountIds === null
                      || selectedAccountIds.includes(account.id);

                    return (
                      <label
                        className="transaction-account-filter-option"
                        key={account.id}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAccountFilter(account.id)}
                        />

                        <span>
                          <strong>{account.name}</strong>
                          <small>{account.currency}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {accounts.length === 0 && (
                  <small className="transaction-account-filter-empty">
                    No Accounts available.
                  </small>
                )}
              </div>
            </details>
          </div>
          <label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{allCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Label<select value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)}><option value="all">All labels</option>{availableLabels.map((label) => <option key={label.toLowerCase()} value={label}>{transactionLabelText(label)}</option>)}</select></label>
        </div>
      </section>

      {loading ? <div className="loading-panel">Loading money activity…</div> : visibleTransactions.length === 0 ? (
        <EmptyState title="No matching money activity" description="Change the filters or add money in, money out, or a money move." action={accounts.length && spaces.length ? <button className="button primary" onClick={() => setShowForm(true)}>Add money activity</button> : undefined} />
      ) : (
        <section className="transaction-list">
          {visibleTransactions.map((item) => {
            const source = accountMap.get(item.accountId);
            const destination = item.destinationAccountId ? accountMap.get(item.destinationAccountId) : undefined;
            const space = spaceMap.get(item.spaceId);
            const isOutflow = item.type === 'expense';
            const isIncome = item.type === 'income';
            const category = item.categoryId ? categoryMap.get(item.categoryId) || transactionCategorySnapshot(item) : transactionCategorySnapshot(item);
            return <article className={`transaction-row ${item.status === 'reversed' ? 'reversed' : ''}`} key={item.id}>
              <span className={`category-icon category-${category.color}`}>{categoryIconGlyph(category.icon)}</span>
              <div className="transaction-main">
                <div>
                  <h2>{item.category || typeLabels[item.type]}</h2>
                  <p>{item.counterparty || item.note || typeLabels[item.type]}</p>

                  {(item.labels || []).length > 0 && (
                    <div className="transaction-label-list compact">
                      {(item.labels || []).map((label) => (
                        <span
                          className="transaction-label-chip"
                          key={`${item.id}-${label.toLowerCase()}`}
                        >
                          {transactionLabelText(label)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <small>{item.displayId}</small>
              </div>
              <div className="transaction-context">
                <strong>{space?.name || 'Unknown Space'}</strong>
                <small>{source?.name || 'Unknown Account'}{destination ? ` → ${destination.name}` : ''}</small>
              </div>
              <div className="transaction-amount">
                <strong className={isIncome ? 'money-positive' : isOutflow ? 'money-negative' : ''}>{isIncome ? '+' : isOutflow ? '−' : ''}{formatMoney(item.amountMinor, item.currency)}</strong>
                <small>{item.transactionDate}</small>
              </div>
              <div className="transaction-status">
                <span className={`status-badge ${item.status}`}>{statusLabels[item.status]}</span>
                {(item.type !== 'reversal' || (transactionAttachmentCounts[item.id] || 0) > 0) && <button
                  type="button"
                  className="text-button receipt-shortcut"
                  aria-label={`${transactionAttachmentCounts[item.id] ? 'View receipts' : 'Add receipt'} for ${item.displayId}`}
                  onClick={() => setReceiptTransaction(item)}
                >{transactionAttachmentCounts[item.id] ? `View receipts (${transactionAttachmentCounts[item.id]})` : 'Add receipt'}</button>}
                <button type="button" className="text-button" onClick={() => setSelectedTransaction(item)}>Details</button>
              </div>
            </article>;
          })}
        </section>
      )}

      {showForm && profile && <MoneyActivityModal
        accounts={activeAccounts}
        spaces={spaces}
        categories={allCategories}
        labelSuggestions={availableLabels}
        onCategoriesChanged={refreshCategories}
        timezone={profile.timezone}
        online={online}
        onClose={() => setShowForm(false)}
        onSubmit={postTransaction}
        onComplete={async (message, refresh) => {
          setShowForm(false);
          setFeedback(message);
          if (refresh) await load();
        }}
      />}

      {showCategoryManager && <CategoryManager
        customCategories={customCategories}
        onClose={() => setShowCategoryManager(false)}
        onChanged={load}
      />}

      {selectedTransaction && <TransactionDetails
        item={selectedTransaction}
        source={accountMap.get(selectedTransaction.accountId)}
        destination={selectedTransaction.destinationAccountId ? accountMap.get(selectedTransaction.destinationAccountId) : undefined}
        space={spaceMap.get(selectedTransaction.spaceId)}
        category={selectedTransaction.categoryId ? categoryMap.get(selectedTransaction.categoryId) || transactionCategorySnapshot(selectedTransaction) : transactionCategorySnapshot(selectedTransaction)}
        online={online}
        onClose={() => setSelectedTransaction(null)}
        onReverse={() => askReverse(selectedTransaction)}
        onAttachmentsChanged={(count) => updateAttachmentCount(selectedTransaction.id, count)}
      />}

      {receiptTransaction && <TransactionDetails
        item={receiptTransaction}
        source={accountMap.get(receiptTransaction.accountId)}
        destination={receiptTransaction.destinationAccountId ? accountMap.get(receiptTransaction.destinationAccountId) : undefined}
        space={spaceMap.get(receiptTransaction.spaceId)}
        category={receiptTransaction.categoryId ? categoryMap.get(receiptTransaction.categoryId) || transactionCategorySnapshot(receiptTransaction) : transactionCategorySnapshot(receiptTransaction)}
        online={online}
        receiptsOnly
        onClose={() => setReceiptTransaction(null)}
        onReverse={() => askReverse(receiptTransaction)}
        onAttachmentsChanged={(count) => updateAttachmentCount(receiptTransaction.id, count)}
      />}

      {reverseDialog && <ActionConfirmModal state={reverseDialog} busy={reverseBusy} error={error} onClose={() => { setReverseDialog(null); setError(''); }} onConfirm={() => void handleReverse()} />}
    </main>
  );
}

function CategoryBadge({ category }: { category: TransactionCategory }) {
  return <span className="category-badge"><span className={`category-icon small category-${category.color}`}>{categoryIconGlyph(category.icon)}</span><span>{category.name}</span></span>;
}

export function MoneyActivityModal({
  accounts,
  spaces,
  categories,
  labelSuggestions,
  timezone,
  online,
  initialType,
  lockedSpaceId,
  onCategoriesChanged,
  onClose,
  onSubmit,
  onComplete,
}: {
  accounts: Account[];
  spaces: Space[];
  categories: TransactionCategory[];
  labelSuggestions?: string[];
  timezone: string;
  online: boolean;
  initialType?: Exclude<PrimaryType, 'transfer'>;
  lockedSpaceId?: string;
  onCategoriesChanged?: () => Promise<TransactionCategory[]>;
  onClose: () => void;
  onSubmit: (values: TransactionInput) => Promise<PostTransactionOutcome>;
  onComplete: (message: string, refresh: boolean) => Promise<void>;
}) {
  const { user } = useAuth();
  const maxAttachmentFiles = 5;
  const maxAttachmentSizeBytes = 10 * 1024 * 1024;
  const chooseFilesRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<PrimaryType>(initialType || 'expense');
  const initialSpaceId = lockedSpaceId && spaces.some((space) => space.id === lockedSpaceId)
    ? lockedSpaceId
    : spaces[0]?.id || '';
  const [spaceId, setSpaceId] = useState(initialSpaceId);
  const selectedSpace = spaces.find((space) => space.id === spaceId);
  const [localCategories, setLocalCategories] = useState<TransactionCategory[]>(categories);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const compatibleAccounts = accounts.filter((account) => !selectedSpace || account.currency === selectedSpace.currency);
  const [accountId, setAccountId] = useState(compatibleAccounts[0]?.id || accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(dateInTimezone(timezone));
  const [categoryId, setCategoryId] = useState('');
  const [labelDraft, setLabelDraft] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>(suggestedPaymentMethod(accounts[0]));
  const [paymentMethodCustom, setPaymentMethodCustom] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [savedState, setSavedState] = useState<{
    mode: 'posted_with_failures' | 'queued_with_files';
    transactionId?: string;
    spaceId: string;
    uploadedCount: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attachmentError, setAttachmentError] = useState('');

  const scope = spaceScope(selectedSpace);
  const categoryOptions = localCategories.filter((category) => type !== 'transfer' && categoryApplies(category, type, scope));
  const selectedCategory = categoryOptions.find((category) => category.id === categoryId);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);
  useEffect(() => {
    const nextAccounts = accounts.filter((account) => !selectedSpace || account.currency === selectedSpace.currency);
    if (!nextAccounts.some((account) => account.id === accountId)) setAccountId(nextAccounts[0]?.id || '');
    if (destinationAccountId === accountId || !nextAccounts.some((account) => account.id === destinationAccountId)) setDestinationAccountId('');
  }, [accountId, accounts, destinationAccountId, selectedSpace]);

  useEffect(() => {
    if (type === 'transfer') {
      setCategoryId('');
      return;
    }
    if (!categoryOptions.some((category) => category.id === categoryId)) setCategoryId(categoryOptions[0]?.id || '');
  }, [categoryId, categoryOptions, type]);

  const sourceAccount = accounts.find((account) => account.id === accountId);
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId);
  useEffect(() => { setPaymentMethod(suggestedPaymentMethod(sourceAccount)); setPaymentMethodCustom(''); }, [accountId]);
  const destinationOptions = compatibleAccounts.filter((account) => account.id !== accountId);
  let amountMinor = 0;
  try { amountMinor = amount ? toMinorUnits(amount) : 0; } catch { amountMinor = 0; }
  const projectedSource = sourceAccount ? sourceAccount.ledgerBalanceMinor + accountEffectForPreview(sourceAccount, type, amountMinor) : 0;
  const projectedDestination = destinationAccount ? destinationAccount.ledgerBalanceMinor + accountEffectForPreview(destinationAccount, type, amountMinor, true) : 0;

  function pendingFileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }

  function addPendingFiles(files: FileList | File[]) {
    setAttachmentError('');
    if (!online) {
      setAttachmentError('Connect to the internet to select a receipt or document. You can still save the money activity without one.');
      return;
    }

    const currentKeys = new Set(pendingFiles.map(pendingFileKey));
    const next = [...pendingFiles];
    for (const file of Array.from(files)) {
      if (next.length >= maxAttachmentFiles) {
        setAttachmentError('You can attach up to five files.');
        break;
      }
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        setAttachmentError(`${file.name} is not an image or PDF.`);
        continue;
      }
      if (file.size <= 0 || file.size >= maxAttachmentSizeBytes) {
        setAttachmentError(`${file.name} must be smaller than 10 MB.`);
        continue;
      }
      const key = pendingFileKey(file);
      if (currentKeys.has(key)) continue;
      currentKeys.add(key);
      next.push(file);
    }
    setPendingFiles(next);
  }

  function removePendingFile(file: File) {
    const key = pendingFileKey(file);
    setPendingFiles((current) => current.filter((item) => pendingFileKey(item) !== key));
    setAttachmentError('');
  }

  async function uploadFiles(transactionId: string, targetSpaceId: string, files: File[]) {
    const failed: File[] = [];
    let uploaded = 0;
    let lastError = '';
    for (const file of files) {
      try {
        await uploadTransactionAttachment({ transactionId, spaceId: targetSpaceId, file });
        uploaded += 1;
      } catch (nextError) {
        failed.push(file);
        lastError = getErrorMessage(nextError);
      }
    }
    return { failed, uploaded, lastError };
  }

  async function finishSaved(message: string, refresh = true) {
    if (busy) return;
    await onComplete(message, refresh);
  }

  async function retryAttachments() {
    if (!savedState?.transactionId || busy || pendingFiles.length === 0) return;
    if (!online) {
      setAttachmentError('Reconnect to the internet before retrying these attachments.');
      return;
    }
    setBusy(true);
    setAttachmentError('');
    try {
      const result = await uploadFiles(savedState.transactionId, savedState.spaceId, pendingFiles);
      const uploadedCount = savedState.uploadedCount + result.uploaded;
      if (result.failed.length === 0) {
        await onComplete(`Money activity saved with ${uploadedCount} attachment${uploadedCount === 1 ? '' : 's'}.`, true);
        return;
      }
      setPendingFiles(result.failed);
      setSavedState({ ...savedState, uploadedCount });
      setAttachmentError(`${result.failed.length} attachment${result.failed.length === 1 ? '' : 's'} still could not be uploaded. ${result.lastError}`.trim());
    } finally {
      setBusy(false);
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || savedState) return;
    setBusy(true);
    setError('');
    setAttachmentError('');
    try {
      const nextAmountMinor = toMinorUnits(amount);
      if (nextAmountMinor <= 0) throw new Error('Enter an amount greater than BND 0.00.');
      if (!spaceId || !accountId) throw new Error('Choose a Space and Account.');
      if (type === 'transfer' && !destinationAccountId) throw new Error('Choose a destination Account.');
      if (type !== 'transfer' && !selectedCategory) throw new Error('Choose a category.');
      if (pendingFiles.length > 0 && !online) {
        throw new Error('Reconnect to upload the selected attachments, or remove them and save this money activity offline.');
      }

      const labels = parseTransactionLabels(labelDraft);

      const outcome = await onSubmit({
        type,
        accountId,
        destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
        spaceId,
        amountMinor: nextAmountMinor,
        currency: sourceAccount?.currency || selectedSpace?.currency,
        transactionDate,
        categoryId: selectedCategory?.id,
        category: selectedCategory?.name,
        categoryIcon: selectedCategory?.icon,
        categoryColor: selectedCategory?.color,
        categoryScope: selectedCategory?.scope,
        counterparty,
        note,
        labels,
        paymentMethod,
        paymentMethodLabel: paymentMethod === 'other' ? paymentMethodCustom.trim() : undefined,
      });

      if (outcome.mode === 'queued') {
        if (pendingFiles.length > 0) {
          setSavedState({ mode: 'queued_with_files', spaceId, uploadedCount: 0 });
          setAttachmentError('Money activity was saved on this device, but attachments cannot be queued. After it syncs, open Details to attach these files.');
          return;
        }
        await onComplete('Saved on this device. BajetBN will sync it when internet returns.', false);
        return;
      }

      if (pendingFiles.length === 0) {
        await onComplete('Money activity saved.', true);
        return;
      }

      if (!outcome.transactionId) {
        setSavedState({ mode: 'posted_with_failures', spaceId, uploadedCount: 0 });
        setAttachmentError('Money activity was saved, but BajetBN could not link the selected attachments. Add them later from Details.');
        return;
      }

      const result = await uploadFiles(outcome.transactionId, spaceId, pendingFiles);
      if (result.failed.length === 0) {
        await onComplete(`Money activity saved with ${result.uploaded} attachment${result.uploaded === 1 ? '' : 's'}.`, true);
        return;
      }

      setPendingFiles(result.failed);
      setSavedState({ mode: 'posted_with_failures', transactionId: outcome.transactionId, spaceId, uploadedCount: result.uploaded });
      setAttachmentError(`Money activity was saved. ${result.failed.length} attachment${result.failed.length === 1 ? '' : 's'} could not be uploaded. ${result.lastError}`.trim());
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  if (savedState) {
    const queued = savedState.mode === 'queued_with_files';
    return <Modal title="Money activity saved" onClose={() => { if (!busy) void finishSaved(queued ? 'Saved on this device. Attachments can be added after it syncs.' : 'Money activity saved. You can add the remaining attachments later from Details.', !queued); }}>
      <div className={`notice ${queued ? 'warning' : 'success'}`}>
        <strong>{queued ? 'Saved for offline sync' : 'Transaction saved safely'}</strong>
        <span>{queued ? 'The selected files were not stored on this device.' : `${savedState.uploadedCount} attachment${savedState.uploadedCount === 1 ? '' : 's'} uploaded successfully.`}</span>
      </div>
      {attachmentError && <div className="notice warning">{attachmentError}</div>}
      {pendingFiles.length > 0 && <div className="transaction-inline-file-list">
        {pendingFiles.map((file) => <div className="transaction-inline-file-row" key={pendingFileKey(file)}>
          <div><strong>{file.name}</strong><small>{Math.max(1, Math.round(file.size / 1024))} KB</small></div>
          {!queued && <button type="button" className="text-button" disabled={busy} onClick={() => removePendingFile(file)}>Remove</button>}
        </div>)}
      </div>}
      <div className="modal-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={() => void finishSaved(queued ? 'Saved on this device. Attachments can be added after it syncs.' : 'Money activity saved. You can add the remaining attachments later from Details.', !queued)}>{queued ? 'Close' : 'Finish without remaining attachments'}</button>
        {!queued && savedState.transactionId && pendingFiles.length > 0 && <button type="button" className="button primary" disabled={busy || !online} onClick={() => void retryAttachments()}>{busy ? 'Retrying…' : 'Retry attachments'}</button>}
      </div>
    </Modal>;
  }

  const closeForm = () => { if (!busy) onClose(); };
  const saveLabel = busy
    ? pendingFiles.length > 0 ? 'Saving and uploading…' : 'Saving…'
    : !online ? 'Save on this device'
      : pendingFiles.length > 0 ? `Save and attach ${pendingFiles.length} file${pendingFiles.length === 1 ? '' : 's'}`
        : 'Save money activity';

  const typeOptions: PrimaryType[] = lockedSpaceId
    ? ['expense', 'income']
    : ['expense', 'income', 'transfer'];
  return <Modal title="Add money activity" onClose={closeForm}><form className="transaction-form" onSubmit={submit}>
    {error && <div className="notice error">{error}</div>}
    {!online && <div className="notice warning compact-notice"><strong>Saving offline</strong><span>This money activity will stay on this device and sync safely when internet returns.</span></div>}
    <div className="segmented-control transaction-type-picker" role="group" aria-label="Money activity type">
      {typeOptions.map((value) => <button type="button" key={value} className={type === value ? 'active' : ''} onClick={() => setType(value)}>{typeLabels[value]}</button>)}
    </div>

    <div className="form-grid">
      <label>Date<input required type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} /></label>
      {lockedSpaceId
        ? <div className="locked-space-field"><span>Space</span><strong>{selectedSpace?.name || 'This Space'}</strong><small>Locked to this Space</small></div>
        : <label>Space<select required value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>{spaces.map((space) => <option value={space.id} key={space.id}>{space.name} · {space.type === 'sme' ? 'SME' : 'Personal'} · {space.currency}</option>)}</select></label>}
      <label className={type === 'transfer' ? '' : 'span-2'}>{type === 'income' ? 'Money goes into' : type === 'expense' ? 'Money comes from' : 'Move from account'}<select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{compatibleAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label>
      {type === 'transfer' && <label>Move to account<select required value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)}><option value="">Choose account</option>{destinationOptions.map((account) => <option value={account.id} key={account.id}>{account.name} · {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label>}
      <label className="span-2 amount-field">Amount ({sourceAccount?.currency || selectedSpace?.currency || 'BND'})<input required autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
    </div>

    {type !== 'transfer' && <fieldset className="category-picker"><legend className="category-picker-legend"><span>Category</span><button type="button" className="text-button" onClick={() => setShowCategoryEditor(true)}>+ Add category</button></legend><div className="category-option-grid">
      {categoryOptions.map((category) => <button type="button" key={category.id} className={`category-option ${categoryId === category.id ? 'selected' : ''}`} onClick={() => setCategoryId(category.id)}>
        <span className={`category-icon category-${category.color}`}>{categoryIconGlyph(category.icon)}</span><span>{category.name}</span>{!category.isSystem && <small>Custom</small>}
      </button>)}
    </div></fieldset>}

    <section className="transaction-label-editor">
      <div className="transaction-label-editor-heading">
        <div>
          <strong>Labels (optional)</strong>
          <small>Category remains your main financial classification. Labels are optional and help you filter and find records.</small>
        </div>

        <span>{parseTransactionLabels(labelDraft).length} of {MAX_TRANSACTION_LABELS} labels</span>
      </div>

      <input
        value={labelDraft}
        onChange={(event) => setLabelDraft(event.target.value)}
        placeholder="#Rimba, #RentalHouse"
        maxLength={280}
        aria-label="Transaction labels"
      />

      {parseTransactionLabels(labelDraft).length > 0 && (
        <div className="transaction-label-list">
          {parseTransactionLabels(labelDraft).map((label) => (
            <span
              className="transaction-label-chip"
              key={label.toLowerCase()}
            >
              {transactionLabelText(label)}
            </span>
          ))}
        </div>
      )}

      {(labelSuggestions || []).length > 0 && (
        <div className="transaction-label-suggestions">
          <small>Previously used</small>

          <div>
            {(labelSuggestions || [])
              .filter(
                (label) =>
                  !parseTransactionLabels(labelDraft).some(
                    (selected) =>
                      selected.toLowerCase() === label.toLowerCase(),
                  ),
              )
              .slice(0, 8)
              .map((label) => (
                <button
                  type="button"
                  className="transaction-label-suggestion"
                  key={label.toLowerCase()}
                  disabled={
                    parseTransactionLabels(labelDraft).length
                    >= MAX_TRANSACTION_LABELS
                  }
                  onClick={() => {
                    const next = parseTransactionLabels(
                      `${labelDraft},${label}`,
                    );

                    setLabelDraft(
                      next
                        .map(transactionLabelText)
                        .join(', '),
                    );
                  }}
                >
                  {transactionLabelText(label)}
                </button>
              ))}
          </div>
        </div>
      )}

      <small>
        Add up to 8 labels to this transaction. Example:
        #Rimba, #KualaBalai, #RentalHouse.
      </small>
    </section>

    <div className="form-grid">
      {type !== 'transfer' && <label>{type === 'income' ? 'Source or customer' : 'Shop or person paid'}<input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder="Optional" maxLength={120} /></label>}
      <PaymentMethodField className={type === 'transfer' ? 'span-2' : ''} label={type === 'transfer' ? 'How was the money moved?' : 'Payment method'} value={paymentMethod} customLabel={paymentMethodCustom} onChange={(value, custom) => { setPaymentMethod(value); setPaymentMethodCustom(custom); }} />
      <label className="span-2">Note<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional details" maxLength={500} /></label>
    </div>

    <section className="transaction-inline-attachments" aria-labelledby="inline-attachment-title">
      <div className="transaction-attachments-heading">
        <div><h3 id="inline-attachment-title">Receipt or document (optional)</h3><p>Skip this section when you do not have a receipt. You can also attach files later from Money activity details.</p></div>
        <span>{pendingFiles.length}/{maxAttachmentFiles}</span>
      </div>
      <input ref={chooseFilesRef} hidden type="file" multiple accept="image/*,application/pdf" disabled={!online || busy || pendingFiles.length >= maxAttachmentFiles} onChange={(event) => { if (event.target.files) addPendingFiles(event.target.files); event.currentTarget.value = ''; }} />
      <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" disabled={!online || busy || pendingFiles.length >= maxAttachmentFiles} onChange={(event) => { if (event.target.files) addPendingFiles(event.target.files); event.currentTarget.value = ''; }} />
      <div className="transaction-inline-picker-actions">
        <button type="button" className="button secondary" disabled={!online || busy || pendingFiles.length >= maxAttachmentFiles} onClick={() => chooseFilesRef.current?.click()}>Choose files</button>
        <button type="button" className="button ghost" disabled={!online || busy || pendingFiles.length >= maxAttachmentFiles} onClick={() => cameraRef.current?.click()}>Take photo</button>
      </div>
      {pendingFiles.length > 0 && <div className="transaction-inline-file-list">
        {pendingFiles.map((file) => <div className="transaction-inline-file-row" key={pendingFileKey(file)}>
          <div><strong>{file.name}</strong><small>{Math.max(1, Math.round(file.size / 1024))} KB</small></div>
          <button type="button" className="text-button" disabled={busy} onClick={() => removePendingFile(file)}>Remove</button>
        </div>)}
      </div>}
      {!online && <div className="notice warning compact-notice"><strong>Internet required for attachments</strong><span>You can still save this money activity without a file and attach one later.</span></div>}
      {attachmentError && <div className="notice error">{attachmentError}</div>}
      <small>Images and PDFs only. Up to five files, each smaller than 10 MB.</small>
    </section>

    {sourceAccount && amountMinor > 0 && <div className="transaction-preview">
      <div><span>{sourceAccount.name} after saving</span><strong>{formatMoney(projectedSource, sourceAccount.currency)}</strong></div>
      {type === 'transfer' && destinationAccount && <div><span>{destinationAccount.name} after saving</span><strong>{formatMoney(projectedDestination, destinationAccount.currency)}</strong></div>}
      <small>Preview only. BajetBN will safely update the final account balances.</small>
    </div>}

    {selectedSpace && compatibleAccounts.length === 0 && <div className="notice error">No account uses {selectedSpace.currency}. Choose another Space or create a matching Account.</div>}
    <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={closeForm}>Cancel</button><button className="button primary" disabled={busy || compatibleAccounts.length === 0 || (type !== 'transfer' && !selectedCategory)}>{saveLabel}</button></div>
  </form>
  {showCategoryEditor && type !== 'transfer' && <CategoryEditor
    category={null}
    defaultKind={type === 'income' ? 'income' : 'expense'}
    defaultScope={scope}
    onClose={() => setShowCategoryEditor(false)}
    onSaved={async (savedName) => {
      const nextCategories = onCategoriesChanged
        ? await onCategoriesChanged()
        : user
          ? [
              ...DEFAULT_TRANSACTION_CATEGORIES,
              ...(await listAllCustomCategories(user.uid)).filter((item) => !item.archivedAt),
            ]
          : localCategories;
      setLocalCategories(nextCategories);
      const created = nextCategories.find((category) =>
        !category.archivedAt
        && category.name.trim().toLowerCase() === (savedName || '').trim().toLowerCase()
        && categoryApplies(category, type, scope));
      if (created) setCategoryId(created.id);
      setShowCategoryEditor(false);
    }}
  />}
  </Modal>;
}

function TransactionDetails({ item, source, destination, space, category, online, receiptsOnly = false, onClose, onReverse, onAttachmentsChanged }: {
  item: FinancialTransaction;
  source?: Account;
  destination?: Account;
  space?: Space;
  category: TransactionCategory;
  online: boolean;
  receiptsOnly?: boolean;
  onClose: () => void;
  onReverse: () => void;
  onAttachmentsChanged?: (count: number) => void;
}) {
  const [attachments, setAttachments] = useState<TransactionAttachment[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [removeId, setRemoveId] = useState('');

  const loadAttachments = async () => {
    try {
      const next = await listTransactionAttachments(item.id);
      setAttachments(next);
      onAttachmentsChanged?.(next.length);
      const resolved = await Promise.all(next.map(async (attachment) => {
        try { return [attachment.id, await getTransactionAttachmentUrl(attachment.storagePath)] as const; }
        catch { return [attachment.id, ''] as const; }
      }));
      setAttachmentUrls(Object.fromEntries(resolved));
    } catch (error) {
      setAttachmentError(getErrorMessage(error));
    }
  };

  useEffect(() => { void loadAttachments(); }, [item.id]);

  async function addAttachment() {
    if (!selectedFile || attachmentBusy) return;
    setAttachmentBusy(true);
    setAttachmentError('');
    try {
      await uploadTransactionAttachment({ transactionId: item.id, spaceId: item.spaceId, file: selectedFile });
      setSelectedFile(null);
      await loadAttachments();
    } catch (error) {
      setAttachmentError(getErrorMessage(error));
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function confirmRemoveAttachment() {
    if (!removeId || attachmentBusy) return;
    setAttachmentBusy(true);
    setAttachmentError('');
    try {
      await removeTransactionAttachment(removeId);
      setRemoveId('');
      await loadAttachments();
    } catch (error) {
      setAttachmentError(getErrorMessage(error));
    } finally {
      setAttachmentBusy(false);
    }
  }

  return <Modal title={receiptsOnly ? 'Receipts & documents' : 'Money activity details'} onClose={onClose}>
    {!receiptsOnly && <>
    <div className="transaction-detail-hero">
      <CategoryBadge category={category} />
      <strong className={item.type === 'income' ? 'money-positive' : item.type === 'expense' ? 'money-negative' : ''}>{item.type === 'income' ? '+' : item.type === 'expense' ? '−' : ''}{formatMoney(item.amountMinor, item.currency)}</strong>
      <span className={`status-badge ${item.status}`}>{statusLabels[item.status]}</span>
    </div>
    <dl className="detail-list">
      <Detail label="Record number">{item.displayId}</Detail>
      <Detail label="Type">{item.type === 'reversal' && item.originalType ? `Undo of ${typeLabels[item.originalType]}` : typeLabels[item.type]}</Detail>
      <Detail label="Date">{item.transactionDate}</Detail>
      <Detail label="Space">{space?.name || 'Unknown Space'}</Detail>
      <Detail label="Account">{source?.name || 'Unknown Account'}{destination ? ` → ${destination.name}` : ''}</Detail>
      <Detail label={item.type === 'income' ? 'Money from' : 'Paid to'}>{item.counterparty || '—'}</Detail>
      <Detail label="Payment method">{paymentMethodLabel(item.paymentMethod, item.paymentMethodLabel)}</Detail>
      {(item.labels || []).length > 0 && (
        <Detail label="Labels">
          <div className="transaction-label-list">
            {(item.labels || []).map((label) => (
              <span
                className="transaction-label-chip"
                key={label.toLowerCase()}
              >
                {transactionLabelText(label)}
              </span>
            ))}
          </div>
        </Detail>
      )}
      <Detail label="Note">{item.note || '—'}</Detail>
      {item.budgetIds && item.budgetIds.length > 0 && <Detail label="Budgets">{item.budgetIds.length} matching budget{item.budgetIds.length === 1 ? '' : 's'}</Detail>}
      {item.commitmentId && <Detail label="Bill or instalment">Linked bill or instalment</Detail>}
      {item.sharedBillAssignmentId && <Detail label="Person's bill share">{item.sharedBillAssignmentId}</Detail>}
      {item.sharedBillPaymentId && <Detail label="Payment submitted">{item.sharedBillPaymentId}</Detail>}
      {item.paymentProofPath && <Detail label="Payment proof">Attached in its Space</Detail>}
      {item.recurringTemplateId && <Detail label="Recurring money"><Link to="/recurring">Created automatically from a recurring template</Link></Detail>}
      {item.recurringScheduledDate && <Detail label="Scheduled date">{item.recurringScheduledDate}</Detail>}
      {item.reversalOf && <Detail label="Undoing record">{item.reversalOf}</Detail>}
      {item.reversedBy && <Detail label="Undone by">{item.reversedBy}</Detail>}
    </dl>
    </>}

    {receiptsOnly && <div className="transaction-receipt-shortcut-summary"><strong>{item.category || typeLabels[item.type]}</strong><span>{item.displayId} · {item.transactionDate}</span></div>}

    <section className="transaction-attachments" aria-labelledby="transaction-attachments-title">
      <div className="transaction-attachments-heading">
        <div><h3 id="transaction-attachments-title">Receipts & documents</h3><p>Keep up to five images or PDF files with this money activity.</p></div>
        <span>{attachments.length}/5</span>
      </div>
      {attachments.length === 0 && <p className="muted">No receipt or document attached.</p>}
      {attachments.length > 0 && <div className="transaction-attachment-list">
        {attachments.map((attachment) => <div className="transaction-attachment-row" key={attachment.id}>
          <div><strong>{attachment.fileName}</strong><small>{Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB</small></div>
          {removeId === attachment.id ? <div className="transaction-attachment-confirm">
            <span>Remove this file?</span>
            <button type="button" className="button danger small" disabled={attachmentBusy} onClick={() => void confirmRemoveAttachment()}>Remove</button>
            <button type="button" className="button secondary small" disabled={attachmentBusy} onClick={() => setRemoveId('')}>Keep</button>
          </div> : <div className="transaction-attachment-actions">
            {attachmentUrls[attachment.id] && <a className="button secondary small" href={attachmentUrls[attachment.id]} target="_blank" rel="noreferrer">Open</a>}
            <button type="button" className="button ghost small" disabled={!online || attachmentBusy} onClick={() => setRemoveId(attachment.id)}>Remove</button>
          </div>}
        </div>)}
      </div>}
      {item.type !== 'reversal' && attachments.length < 5 && <div className="transaction-attachment-upload">
        <input type="file" accept="image/*,application/pdf" disabled={!online || attachmentBusy} onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
        <button type="button" className="button secondary" disabled={!online || !selectedFile || attachmentBusy} onClick={() => void addAttachment()}>{attachmentBusy ? 'Saving…' : 'Attach file'}</button>
      </div>}
      {!online && <div className="notice warning">Connect to the internet to add or remove receipts and documents.</div>}
      {attachmentError && <div className="notice error">{attachmentError}</div>}
      <small>Images and PDFs only. Maximum 10 MB per file.</small>
    </section>

    <div className="modal-actions"><button className="button secondary" onClick={onClose}>Close</button>{!receiptsOnly && item.type !== 'reversal' && item.status === 'posted' && <button className="button danger" onClick={onReverse}>Undo this activity</button>}</div>
  </Modal>;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

function CategoryManager({ customCategories, onClose, onChanged }: {
  customCategories: TransactionCategory[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<TransactionCategory | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [lifecycleDialog, setLifecycleDialog] = useState<LifecycleConfirmState<TransactionCategory, 'archive' | 'delete'> | null>(null);
  const active = customCategories.filter((item) => !item.archivedAt);
  const hidden = customCategories.filter((item) => item.archivedAt);

  function askLifecycle(category: TransactionCategory, action: 'archive' | 'delete') {
    setError('');
    setLifecycleDialog(action === 'archive'
      ? { record: category, action, title: `Hide ${category.name}?`, description: 'This category will move to Hidden Categories and will not appear in new money activity forms.', note: 'Past money activity will keep this category name.', confirmLabel: 'Hide category' }
      : { record: category, action, title: `Delete ${category.name} permanently?`, description: 'Permanent deletion only works when this category has never been used.', note: 'This cannot be undone.', confirmLabel: 'Delete permanently', tone: 'danger' });
  }

  async function runLifecycle() {
    if (!lifecycleDialog) return;
    const { record: category, action } = lifecycleDialog;
    setBusyId(category.id); setError('');
    try { await manageCategory(category.id, action); setLifecycleDialog(null); await onChanged(); }
    catch (nextError) {
      const message = getErrorMessage(nextError);
      if (action === 'delete' && /hide/i.test(message)) {
        setLifecycleDialog({ record: category, action: 'archive', title: `${category.name} cannot be deleted`, description: message, note: 'Hide it instead. It will disappear from new forms while previous records remain correct.', confirmLabel: 'Hide category instead' });
      } else setError(message);
    }
    finally { setBusyId(''); }
  }


  return <Modal title="Edit categories" onClose={onClose}>
    <div className="category-manager-intro"><div><strong>Brunei-ready defaults</strong><p>{DEFAULT_TRANSACTION_CATEGORIES.length} built-in categories are available automatically. Add custom categories for your own household or SME workflow.</p></div><div className="button-row"><Link className="button secondary archive-button" to="/categories/archived" onClick={onClose}>Hidden Categories <span>{hidden.length}</span></Link><button className="button primary" onClick={() => { setEditing(null); setShowEditor(true); }}>+ Custom category</button></div></div>
    {error && <div className="notice error">{error}</div>}
    {active.length === 0 ? <EmptyState title="No custom categories" description="Ready-made categories are available. Add your own only when you need a different name." /> : <div className="category-manager-list">
      {active.map((category) => <div className="category-manager-row" key={category.id}><CategoryBadge category={category} /><span className="category-meta">{category.kind} · {category.scope}</span><div><button className="text-button" onClick={() => { setEditing(category); setShowEditor(true); }}>Edit</button><button className="text-button" disabled={busyId === category.id} onClick={() => askLifecycle(category, 'archive')}>Hide</button><button className="text-button danger" disabled={busyId === category.id} onClick={() => askLifecycle(category, 'delete')}>Delete</button></div></div>)}
    </div>}
    {lifecycleDialog && <LifecycleConfirmModal state={lifecycleDialog} busy={busyId === lifecycleDialog.record.id} error={error} onClose={() => { setLifecycleDialog(null); setError(''); }} onConfirm={() => void runLifecycle()} />}
    <div className="modal-actions"><button className="button secondary" onClick={onClose}>Close</button></div>
    {showEditor && <CategoryEditor category={editing} onClose={() => setShowEditor(false)} onSaved={async () => { setShowEditor(false); await onChanged(); }} />}
  </Modal>;
}

function CategoryEditor({ category, defaultKind, defaultScope, onClose, onSaved }: {
  category: TransactionCategory | null;
  defaultKind?: CategoryKind;
  defaultScope?: CategoryScope;
  onClose: () => void;
  onSaved: (savedName?: string) => Promise<void>;
}) {
  const [name, setName] = useState(category?.name || '');
  const [kind, setKind] = useState<CategoryKind>(category?.kind || defaultKind || 'expense');
  const [scope, setScope] = useState<CategoryScope>(category?.scope || defaultScope || 'both');
  const [icon, setIcon] = useState(category?.icon || 'dots');
  const [color, setColor] = useState(category?.color || 'teal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (!name.trim()) throw new Error('Category name is required.');
      if (category) await updateCategory({ categoryId: category.id, name, kind, scope, icon, color });
      else await createCategory({ name, kind, scope, icon, color });
      await onSaved(name.trim());
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return <Modal title={category ? 'Edit custom category' : 'Create custom category'} onClose={onClose}><form className="category-editor" onSubmit={submit}>
    {error && <div className="notice error">{error}</div>}
    <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Example: School allowance" /></label>
    <div className="form-grid"><label>Type<select value={kind} onChange={(event) => setKind(event.target.value as CategoryKind)}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Available for<select value={scope} onChange={(event) => setScope(event.target.value as CategoryScope)}><option value="both">Personal and SME</option><option value="personal">Personal only</option><option value="business">SME only</option></select></label></div>
    <fieldset className="category-picker"><legend>Icon</legend><div className="icon-option-grid">{CATEGORY_ICONS.map((value) => <button type="button" aria-label={value} title={value} className={`category-icon category-${color} ${icon === value ? 'selected' : ''}`} key={value} onClick={() => setIcon(value)}>{categoryIconGlyph(value)}</button>)}</div></fieldset>
    <fieldset className="category-picker"><legend>Colour</legend><div className="color-option-grid">{CATEGORY_COLORS.map((value) => <button type="button" aria-label={value} title={value} className={`color-swatch category-${value} ${color === value ? 'selected' : ''}`} key={value} onClick={() => setColor(value)} />)}</div></fieldset>
    <div className="category-preview"><span>Preview</span><CategoryBadge category={{ id: 'preview', ownerId: null, name: name || 'Category name', kind, scope, icon, color, isSystem: false, archivedAt: null }} /></div>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save category'}</button></div>
  </form></Modal>;
}
