import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
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
import { listTransactions, postTransaction, reverseTransaction } from '../../repositories/transactionRepository';
import type {
  Account,
  CategoryKind,
  CategoryScope,
  FinancialTransaction,
  Space,
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

export function TransactionsPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [customCategories, setCustomCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [reverseDialog, setReverseDialog] = useState<ActionConfirmState<FinancialTransaction> | null>(null);
  const [reverseBusy, setReverseBusy] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current_month');
  const [spaceFilter, setSpaceFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState(searchParams.get('accountId') || 'all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [nextTransactions, nextAccounts, nextSpaces, nextCustomCategories] = await Promise.all([
        listTransactions(user.uid),
        listAllAccounts(user.uid),
        listSpaces(user.uid),
        listAllCustomCategories(user.uid),
      ]);
      setTransactions(nextTransactions);
      setAccounts(nextAccounts);
      setSpaces(nextSpaces.filter((space) => !space.archivedAt));
      setCustomCategories(nextCustomCategories);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const allCategories = useMemo(
    () => [...DEFAULT_TRANSACTION_CATEGORIES, ...customCategories.filter((item) => !item.archivedAt)],
    [customCategories],
  );
  const categoryMap = useMemo(() => new Map(allCategories.map((category) => [category.id, category])), [allCategories]);
  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const activeAccounts = useMemo(() => accounts.filter((account) => !account.archivedAt && !account.closedAt), [accounts]);
  const spaceMap = useMemo(() => new Map(spaces.map((space) => [space.id, space])), [spaces]);
  const currentMonth = monthPrefix(profile?.timezone || 'Asia/Brunei');
  const monthlyPosted = transactions.filter((item) => item.status === 'posted' && item.transactionDate.startsWith(currentMonth));
  const income = monthlyPosted.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountMinor, 0);
  const expenses = monthlyPosted.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const transferCount = monthlyPosted.filter((item) => item.type === 'transfer').length;

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
    if (accountFilter !== 'all' && item.accountId !== accountFilter && item.destinationAccountId !== accountFilter) return false;
    if (categoryFilter !== 'all' && item.categoryId !== categoryFilter && `legacy-${item.category}` !== categoryFilter) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    const source = accountMap.get(item.accountId)?.name || '';
    const destination = item.destinationAccountId ? accountMap.get(item.destinationAccountId)?.name || '' : '';
    const space = spaceMap.get(item.spaceId)?.name || '';
    return [item.displayId, item.category, item.counterparty, item.note, source, destination, space]
      .some((value) => value?.toLowerCase().includes(needle));
  });

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
          <button className="button secondary" onClick={() => setShowCategoryManager(true)}>Edit categories</button>
          <button className="button primary" onClick={() => setShowForm(true)} disabled={!accounts.length || !spaces.length}>+ Add money activity</button>
        </div>}
      />
      {error && <div className="notice error">{error}</div>}
      <div className="info-banner"><strong>Safe account updates</strong><span>Saving money activity updates your account balance. Use Undo when something was entered wrongly.</span></div>

      <section className="transaction-summary">
        <div><span>Money in this month</span><strong className="money-positive">{formatMoney(income, profile?.currency || 'BND')}</strong></div>
        <div><span>Money out this month</span><strong className="money-negative">{formatMoney(expenses, profile?.currency || 'BND')}</strong></div>
        <div><span>Money left this month</span><strong>{formatMoney(income - expenses, profile?.currency || 'BND')}</strong></div>
        <div><span>Money moves this month</span><strong>{transferCount}</strong></div>
      </section>

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
        <input className="transaction-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search category, Space, Account, payee…" />
        <div className="transaction-filter-grid">
          <label>Period<select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}><option value="current_month">This month</option><option value="all">All time</option></select></label>
          <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="all">All statuses</option><option value="posted">Saved</option><option value="reversed">Undone</option></select></label>
          <label>Space<select value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)}><option value="all">All Spaces</option>{spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>
          <label>Account<select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}><option value="all">All Accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{allCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
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
                <div><h2>{item.category || typeLabels[item.type]}</h2><p>{item.counterparty || item.note || typeLabels[item.type]}</p></div>
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
                <button className="text-button" onClick={() => setSelectedTransaction(item)}>Details</button>
              </div>
            </article>;
          })}
        </section>
      )}

      {showForm && profile && <TransactionForm
        accounts={activeAccounts}
        spaces={spaces}
        categories={allCategories}
        timezone={profile.timezone}
        onClose={() => setShowForm(false)}
        onSubmit={async (values) => {
          await postTransaction(values);
          setShowForm(false);
          await load();
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
        onClose={() => setSelectedTransaction(null)}
        onReverse={() => askReverse(selectedTransaction)}
      />}

      {reverseDialog && <ActionConfirmModal state={reverseDialog} busy={reverseBusy} error={error} onClose={() => { setReverseDialog(null); setError(''); }} onConfirm={() => void handleReverse()} />}
    </main>
  );
}

function CategoryBadge({ category }: { category: TransactionCategory }) {
  return <span className="category-badge"><span className={`category-icon small category-${category.color}`}>{categoryIconGlyph(category.icon)}</span><span>{category.name}</span></span>;
}

function TransactionForm({ accounts, spaces, categories, timezone, onClose, onSubmit }: {
  accounts: Account[];
  spaces: Space[];
  categories: TransactionCategory[];
  timezone: string;
  onClose: () => void;
  onSubmit: (values: {
    type: PrimaryType;
    accountId: string;
    destinationAccountId?: string;
    spaceId: string;
    amountMinor: number;
    transactionDate: string;
    categoryId?: string;
    category?: string;
    categoryIcon?: string;
    categoryColor?: string;
    categoryScope?: CategoryScope;
    counterparty?: string;
    note?: string;
  }) => Promise<void>;
}) {
  const [type, setType] = useState<PrimaryType>('expense');
  const [spaceId, setSpaceId] = useState(spaces[0]?.id || '');
  const selectedSpace = spaces.find((space) => space.id === spaceId);
  const compatibleAccounts = accounts.filter((account) => !selectedSpace || account.currency === selectedSpace.currency);
  const [accountId, setAccountId] = useState(compatibleAccounts[0]?.id || accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(dateInTimezone(timezone));
  const [categoryId, setCategoryId] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const scope = spaceScope(selectedSpace);
  const categoryOptions = categories.filter((category) => type !== 'transfer' && categoryApplies(category, type, scope));
  const selectedCategory = categoryOptions.find((category) => category.id === categoryId);

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
  const destinationOptions = compatibleAccounts.filter((account) => account.id !== accountId);
  let amountMinor = 0;
  try { amountMinor = amount ? toMinorUnits(amount) : 0; } catch { amountMinor = 0; }
  const projectedSource = sourceAccount ? sourceAccount.ledgerBalanceMinor + accountEffectForPreview(sourceAccount, type, amountMinor) : 0;
  const projectedDestination = destinationAccount ? destinationAccount.ledgerBalanceMinor + accountEffectForPreview(destinationAccount, type, amountMinor, true) : 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const nextAmountMinor = toMinorUnits(amount);
      if (nextAmountMinor <= 0) throw new Error('Enter an amount greater than BND 0.00.');
      if (!spaceId || !accountId) throw new Error('Choose a Space and Account.');
      if (type === 'transfer' && !destinationAccountId) throw new Error('Choose a destination Account.');
      if (type !== 'transfer' && !selectedCategory) throw new Error('Choose a category.');
      await onSubmit({
        type,
        accountId,
        destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
        spaceId,
        amountMinor: nextAmountMinor,
        transactionDate,
        categoryId: selectedCategory?.id,
        category: selectedCategory?.name,
        categoryIcon: selectedCategory?.icon,
        categoryColor: selectedCategory?.color,
        categoryScope: selectedCategory?.scope,
        counterparty,
        note,
      });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return <Modal title="Add money activity" onClose={onClose}><form className="transaction-form" onSubmit={submit}>
    {error && <div className="notice error">{error}</div>}
    <div className="segmented-control transaction-type-picker" role="group" aria-label="Money activity type">
      {(['expense', 'income', 'transfer'] as const).map((value) => <button type="button" key={value} className={type === value ? 'active' : ''} onClick={() => setType(value)}>{typeLabels[value]}</button>)}
    </div>

    <div className="form-grid">
      <label>Date<input required type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} /></label>
      <label>Space<select required value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>{spaces.map((space) => <option value={space.id} key={space.id}>{space.name} · {space.type === 'sme' ? 'SME' : 'Personal'} · {space.currency}</option>)}</select></label>
      <label className={type === 'transfer' ? '' : 'span-2'}>{type === 'income' ? 'Money goes into' : type === 'expense' ? 'Money comes from' : 'Move from account'}<select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{compatibleAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label>
      {type === 'transfer' && <label>Move to account<select required value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)}><option value="">Choose account</option>{destinationOptions.map((account) => <option value={account.id} key={account.id}>{account.name} · {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label>}
      <label className="span-2 amount-field">Amount ({sourceAccount?.currency || selectedSpace?.currency || 'BND'})<input required autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
    </div>

    {type !== 'transfer' && <fieldset className="category-picker"><legend>Category</legend><div className="category-option-grid">
      {categoryOptions.map((category) => <button type="button" key={category.id} className={`category-option ${categoryId === category.id ? 'selected' : ''}`} onClick={() => setCategoryId(category.id)}>
        <span className={`category-icon category-${category.color}`}>{categoryIconGlyph(category.icon)}</span><span>{category.name}</span>{!category.isSystem && <small>Custom</small>}
      </button>)}
    </div></fieldset>}

    <div className="form-grid">
      {type !== 'transfer' && <label>{type === 'income' ? 'Source or customer' : 'Shop or person paid'}<input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder="Optional" maxLength={120} /></label>}
      <label className={type === 'transfer' ? 'span-2' : ''}>Note<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional details" maxLength={500} /></label>
    </div>

    {sourceAccount && amountMinor > 0 && <div className="transaction-preview">
      <div><span>{sourceAccount.name} after saving</span><strong>{formatMoney(projectedSource, sourceAccount.currency)}</strong></div>
      {type === 'transfer' && destinationAccount && <div><span>{destinationAccount.name} after saving</span><strong>{formatMoney(projectedDestination, destinationAccount.currency)}</strong></div>}
      <small>Preview only. BajetBN will safely update the final account balances.</small>
    </div>}

    {selectedSpace && compatibleAccounts.length === 0 && <div className="notice error">No account uses {selectedSpace.currency}. Choose another Space or create a matching Account.</div>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy || compatibleAccounts.length === 0 || (type !== 'transfer' && !selectedCategory)}>{busy ? 'Saving…' : 'Save money activity'}</button></div>
  </form></Modal>;
}

function TransactionDetails({ item, source, destination, space, category, onClose, onReverse }: {
  item: FinancialTransaction;
  source?: Account;
  destination?: Account;
  space?: Space;
  category: TransactionCategory;
  onClose: () => void;
  onReverse: () => void;
}) {
  return <Modal title="Money activity details" onClose={onClose}>
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
      <Detail label="Note">{item.note || '—'}</Detail>
      {item.budgetIds && item.budgetIds.length > 0 && <Detail label="Budgets">{item.budgetIds.length} matching budget{item.budgetIds.length === 1 ? '' : 's'}</Detail>}
      {item.commitmentId && <Detail label="Bill or instalment">Linked bill or instalment</Detail>}
      {item.sharedBillAssignmentId && <Detail label="Person's bill share">{item.sharedBillAssignmentId}</Detail>}
      {item.sharedBillPaymentId && <Detail label="Payment submitted">{item.sharedBillPaymentId}</Detail>}
      {item.paymentProofPath && <Detail label="Payment proof">Attached in its Space</Detail>}
      {item.reversalOf && <Detail label="Undoing record">{item.reversalOf}</Detail>}
      {item.reversedBy && <Detail label="Undone by">{item.reversedBy}</Detail>}
    </dl>
    <div className="modal-actions"><button className="button secondary" onClick={onClose}>Close</button>{item.type !== 'reversal' && item.status === 'posted' && <button className="button danger" onClick={onReverse}>Undo this activity</button>}</div>
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

function CategoryEditor({ category, onClose, onSaved }: {
  category: TransactionCategory | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(category?.name || '');
  const [kind, setKind] = useState<CategoryKind>(category?.kind || 'expense');
  const [scope, setScope] = useState<CategoryScope>(category?.scope || 'both');
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
      await onSaved();
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

