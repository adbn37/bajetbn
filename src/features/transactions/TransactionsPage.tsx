import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAccounts } from '../../repositories/accountRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import { listTransactions, postTransaction, reverseTransaction } from '../../repositories/transactionRepository';
import type { Account, FinancialTransaction, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

const typeLabels = { income: 'Income', expense: 'Expense', transfer: 'Transfer', reversal: 'Reversal' } as const;
const categorySuggestions = ['Salary', 'Sales', 'Food & Drinks', 'Groceries', 'Transport', 'Bills', 'Shopping', 'Health', 'Education', 'Family', 'Business', 'Other'];

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

export function TransactionsPage() {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [nextTransactions, nextAccounts, nextSpaces] = await Promise.all([
        listTransactions(user.uid),
        listAccounts(user.uid),
        listSpaces(user.uid),
      ]);
      setTransactions(nextTransactions);
      setAccounts(nextAccounts);
      setSpaces(nextSpaces.filter((space) => !space.archivedAt));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const currentMonth = monthPrefix(profile?.timezone || 'Asia/Brunei');
  const monthlyPosted = transactions.filter((item) => item.status === 'posted' && item.transactionDate.startsWith(currentMonth));
  const income = monthlyPosted.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountMinor, 0);
  const expenses = monthlyPosted.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountMinor, 0);
  const transferCount = monthlyPosted.filter((item) => item.type === 'transfer').length;

  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const spaceMap = useMemo(() => new Map(spaces.map((space) => [space.id, space])), [spaces]);
  const visibleTransactions = transactions.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    const source = accountMap.get(item.accountId)?.name || '';
    const destination = item.destinationAccountId ? accountMap.get(item.destinationAccountId)?.name || '' : '';
    const space = spaceMap.get(item.spaceId)?.name || '';
    return [item.displayId, item.category, item.counterparty, item.note, source, destination, space]
      .some((value) => value?.toLowerCase().includes(needle));
  });

  const handleReverse = async (item: FinancialTransaction) => {
    if (!window.confirm(`Reverse ${item.displayId}? A new posted reversal will be created.`)) return;
    setError('');
    try {
      await reverseTransaction(item.id, dateInTimezone(profile?.timezone || 'Asia/Brunei'), 'Reversed from transaction history');
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  };

  return (
    <main className="page">
      <PageHeader
        eyebrow="Financial ledger"
        title="Transactions"
        description="Post income, expenses, and transfers to Accounts while connecting every entry to a Space."
        action={<button className="button primary" onClick={() => setShowForm(true)} disabled={!accounts.length || !spaces.length}>+ New transaction</button>}
      />
      {error && <div className="notice error">{error}</div>}
      <div className="info-banner"><strong>Posted records</strong><span>Balances are updated by Cloud Functions. Corrections create reversals; posted financial records are never silently edited.</span></div>
      <section className="transaction-summary">
        <div><span>Income this month</span><strong className="money-positive">{formatMoney(income, profile?.currency || 'BND')}</strong></div>
        <div><span>Expenses this month</span><strong className="money-negative">{formatMoney(expenses, profile?.currency || 'BND')}</strong></div>
        <div><span>Net cash flow</span><strong>{formatMoney(income - expenses, profile?.currency || 'BND')}</strong></div>
        <div><span>Transfers this month</span><strong>{transferCount}</strong></div>
      </section>
      {!accounts.length && !loading && <div className="notice">Create an active Account before posting a transaction.</div>}
      {!spaces.length && !loading && <div className="notice">Create or restore a Space before posting a transaction.</div>}
      <section className="transaction-toolbar">
        <div className="segmented-control" role="group" aria-label="Transaction type filter">
          {(['all', 'income', 'expense', 'transfer'] as const).map((value) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : typeLabels[value]}</button>)}
        </div>
        <input className="transaction-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search category, Space, Account…" />
      </section>
      {loading ? <div className="loading-panel">Loading transactions…</div> : visibleTransactions.length === 0 ? (
        <EmptyState title="No transactions yet" description="Record your first income, expense, or transfer. Each posting will update the linked account ledger." action={accounts.length && spaces.length ? <button className="button primary" onClick={() => setShowForm(true)}>Create transaction</button> : undefined} />
      ) : (
        <section className="transaction-list">
          {visibleTransactions.map((item) => {
            const source = accountMap.get(item.accountId);
            const destination = item.destinationAccountId ? accountMap.get(item.destinationAccountId) : undefined;
            const space = spaceMap.get(item.spaceId);
            const isOutflow = item.type === 'expense';
            const isIncome = item.type === 'income';
            return <article className={`transaction-row ${item.status === 'reversed' ? 'reversed' : ''}`} key={item.id}>
              <span className={`transaction-icon ${item.type}`}>{item.type === 'income' ? '↓' : item.type === 'expense' ? '↑' : item.type === 'transfer' ? '↔' : '↶'}</span>
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
                <span className={`status-badge ${item.status}`}>{item.status}</span>
                {item.type !== 'reversal' && item.status === 'posted' && <button className="text-button danger" onClick={() => void handleReverse(item)}>Reverse</button>}
              </div>
            </article>;
          })}
        </section>
      )}
      {showForm && profile && <TransactionForm
        accounts={accounts}
        spaces={spaces}
        timezone={profile.timezone}
        onClose={() => setShowForm(false)}
        onSubmit={async (values) => {
          await postTransaction(values);
          setShowForm(false);
          await load();
        }}
      />}
    </main>
  );
}

function TransactionForm({ accounts, spaces, timezone, onClose, onSubmit }: {
  accounts: Account[];
  spaces: Space[];
  timezone: string;
  onClose: () => void;
  onSubmit: (values: {
    type: 'income' | 'expense' | 'transfer';
    accountId: string;
    destinationAccountId?: string;
    spaceId: string;
    amountMinor: number;
    transactionDate: string;
    category?: string;
    counterparty?: string;
    note?: string;
  }) => Promise<void>;
}) {
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [spaceId, setSpaceId] = useState(spaces[0]?.id || '');
  const selectedSpace = spaces.find((space) => space.id === spaceId);
  const compatibleAccounts = accounts.filter((account) => !selectedSpace || account.currency === selectedSpace.currency);
  const [accountId, setAccountId] = useState(compatibleAccounts[0]?.id || accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [transactionDate, setTransactionDate] = useState(dateInTimezone(timezone));
  const [category, setCategory] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const nextAccounts = accounts.filter((account) => !selectedSpace || account.currency === selectedSpace.currency);
    if (!nextAccounts.some((account) => account.id === accountId)) setAccountId(nextAccounts[0]?.id || '');
    if (destinationAccountId === accountId || !nextAccounts.some((account) => account.id === destinationAccountId)) setDestinationAccountId('');
  }, [accountId, accounts, destinationAccountId, selectedSpace]);

  const sourceAccount = accounts.find((account) => account.id === accountId);
  const destinationOptions = compatibleAccounts.filter((account) => account.id !== accountId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const amountMinor = toMinorUnits(amount);
      if (amountMinor <= 0) throw new Error('Amount must be greater than zero.');
      if (!spaceId || !accountId) throw new Error('Choose a Space and Account.');
      if (type === 'transfer' && !destinationAccountId) throw new Error('Choose a destination Account.');
      await onSubmit({ type, accountId, destinationAccountId: type === 'transfer' ? destinationAccountId : undefined, spaceId, amountMinor, transactionDate, category, counterparty, note });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return <Modal title="Post transaction" onClose={onClose}><form className="form-grid" onSubmit={submit}>
    {error && <div className="notice error span-2">{error}</div>}
    <label>Type<select value={type} onChange={(event) => setType(event.target.value as 'income' | 'expense' | 'transfer')}><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></select></label>
    <label>Date<input required type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} /></label>
    <label className="span-2">Space<select required value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>{spaces.map((space) => <option value={space.id} key={space.id}>{space.name} · {space.currency}</option>)}</select></label>
    <label className={type === 'transfer' ? '' : 'span-2'}>{type === 'income' ? 'Deposit to' : type === 'expense' ? 'Pay from' : 'From Account'}<select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{compatibleAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label>
    {type === 'transfer' && <label>To Account<select required value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)}><option value="">Select destination</option>{destinationOptions.map((account) => <option value={account.id} key={account.id}>{account.name} · {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label>}
    <label className="span-2">Amount ({sourceAccount?.currency || selectedSpace?.currency || 'BND'})<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
    {type !== 'transfer' && <label>Category<input required list="transaction-categories" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={type === 'income' ? 'Salary, Sales…' : 'Food, Bills…'} /><datalist id="transaction-categories">{categorySuggestions.map((item) => <option value={item} key={item} />)}</datalist></label>}
    {type !== 'transfer' && <label>{type === 'income' ? 'Source' : 'Merchant or payee'}<input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder="Optional" /></label>}
    <label className="span-2">Note<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional details" /></label>
    {selectedSpace && compatibleAccounts.length === 0 && <div className="notice error span-2">No active Account uses {selectedSpace.currency}. Choose another Space or create a matching Account.</div>}
    <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy || compatibleAccounts.length === 0}>{busy ? 'Posting…' : 'Post transaction'}</button></div>
  </form></Modal>;
}
