import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAccounts } from '../../repositories/accountRepository';
import { listCommitments } from '../../repositories/commitmentRepository';
import { listGoals } from '../../repositories/goalRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import { listTransactions } from '../../repositories/transactionRepository';
import type { Account, Commitment, FinancialTransaction, SavingsGoal, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

type SearchKind = 'account' | 'money' | 'bill' | 'goal' | 'space';
type SearchStatus = 'open' | 'finished' | 'saved' | 'undone';

interface SearchResult {
  id: string;
  kind: SearchKind;
  title: string;
  detail: string;
  extra: string;
  route: string;
  searchable: string;
  date?: string;
  spaceId?: string;
  accountId?: string;
  status?: SearchStatus;
  amountMinor?: number;
  currency?: string;
}

function kindLabel(kind: SearchKind) {
  if (kind === 'account') return 'Account';
  if (kind === 'money') return 'Money activity';
  if (kind === 'bill') return 'Bill or instalment';
  if (kind === 'goal') return 'Goal';
  return 'Space';
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

function resultScore(result: SearchResult, query: string) {
  const title = normalizeSearch(result.title);
  const search = normalizeSearch(query);
  if (title === search) return 100;
  if (title.startsWith(search)) return 80;
  if (title.includes(search)) return 60;
  return normalizeSearch(result.searchable).includes(search) ? 30 : 0;
}

export function SearchPage() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState(searchParams.get('q') || '');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [selectedKind, setSelectedKind] = useState<SearchKind | ''>('');
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SearchStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSearchText(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      listAccounts(user.uid),
      listSpaces(user.uid),
      listTransactions(user.uid),
      listCommitments(user.uid),
      listGoals(user.uid),
    ]).then(([nextAccounts, nextSpaces, nextTransactions, nextCommitments, nextGoals]) => {
      setAccounts(nextAccounts);
      setSpaces(nextSpaces.filter((item) => !item.archivedAt));
      setTransactions(nextTransactions);
      setCommitments(nextCommitments);
      setGoals(nextGoals);
    }).catch((nextError) => setError(getErrorMessage(nextError))).finally(() => setLoading(false));
  }, [user]);

  const accountNames = useMemo(() => new Map(accounts.map((item) => [item.id, item.name])), [accounts]);
  const spaceNames = useMemo(() => new Map(spaces.map((item) => [item.id, item.name])), [spaces]);

  const allResults = useMemo<SearchResult[]>(() => [
    ...accounts.map((item) => ({
      id: `account:${item.id}`,
      kind: 'account' as const,
      title: item.name,
      detail: item.institution || (item.type === 'cash' ? 'Cash account' : 'Money account'),
      extra: item.classification === 'business' ? 'Business' : 'Personal',
      route: '/accounts',
      searchable: [item.displayId, item.name, item.institution, item.type, item.classification].filter(Boolean).join(' '),
      accountId: item.id,
      amountMinor: item.ledgerBalanceMinor,
      currency: item.currency,
    })),
    ...transactions.map((item) => ({
      id: `money:${item.id}`,
      kind: 'money' as const,
      title: item.counterparty || item.category || (item.type === 'income' ? 'Money in' : item.type === 'expense' ? 'Money out' : 'Account transfer'),
      detail: item.note || item.category || 'Money activity',
      extra: `${spaceNames.get(item.spaceId) || 'Personal'} · ${accountNames.get(item.accountId) || 'Account'}`,
      route: '/transactions',
      searchable: [item.displayId, item.counterparty, item.note, item.category, item.type, item.transactionDate].filter(Boolean).join(' '),
      date: item.transactionDate,
      spaceId: item.spaceId,
      accountId: item.accountId,
      status: item.status === 'reversed' ? 'undone' as const : 'saved' as const,
      amountMinor: item.amountMinor,
      currency: item.currency,
    })),
    ...commitments.map((item) => ({
      id: `bill:${item.id}`,
      kind: 'bill' as const,
      title: item.name,
      detail: item.payee || (item.type === 'bill' ? 'Bill' : 'Instalment'),
      extra: `${spaceNames.get(item.spaceId) || 'Personal'} · ${item.nextDueDate ? `Next date ${item.nextDueDate}` : 'No next date'}`,
      route: '/bills',
      searchable: [item.displayId, item.name, item.payee, item.categoryName, item.note, item.type].filter(Boolean).join(' '),
      date: item.nextDueDate || item.startDate,
      spaceId: item.spaceId,
      accountId: item.accountId || undefined,
      status: item.status === 'completed' ? 'finished' as const : 'open' as const,
      amountMinor: item.amountMinor,
      currency: item.currency,
    })),
    ...goals.map((item) => ({
      id: `goal:${item.id}`,
      kind: 'goal' as const,
      title: item.name,
      detail: item.note || 'Savings goal',
      extra: `${spaceNames.get(item.spaceId) || 'Personal'} · ${item.targetDate ? `Target date ${item.targetDate}` : 'No target date'}`,
      route: '/goals',
      searchable: [item.displayId, item.name, item.note, item.status].filter(Boolean).join(' '),
      date: item.targetDate || undefined,
      spaceId: item.spaceId,
      status: item.status === 'completed' ? 'finished' as const : 'open' as const,
      amountMinor: item.targetMinor,
      currency: item.currency,
    })),
    ...spaces.map((item) => ({
      id: `space:${item.id}`,
      kind: 'space' as const,
      title: item.name,
      detail: item.description || `${item.type} Space`,
      extra: item.collaborationMode === 'private' ? 'Private' : 'Shared',
      route: '/spaces',
      searchable: [item.displayId, item.name, item.description, item.type].filter(Boolean).join(' '),
      spaceId: item.id,
      status: 'open' as const,
    })),
  ], [accounts, transactions, commitments, goals, spaces, accountNames, spaceNames]);

  const query = searchParams.get('q')?.trim() || '';
  const results = useMemo(() => allResults
    .map((item) => ({ item, score: query ? resultScore(item, query) : 1 }))
    .filter(({ item, score }) => (
      score > 0
      && (!selectedKind || item.kind === selectedKind)
      && (!selectedSpace || item.spaceId === selectedSpace)
      && (!selectedAccount || item.accountId === selectedAccount)
      && (!selectedStatus || item.status === selectedStatus)
      && (!dateFrom || !item.date || item.date >= dateFrom)
      && (!dateTo || !item.date || item.date <= dateTo)
    ))
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .map(({ item }) => item), [allResults, query, selectedKind, selectedSpace, selectedAccount, selectedStatus, dateFrom, dateTo]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const next = searchText.trim();
    setSearchParams(next ? { q: next } : {});
  }

  const currency = profile?.currency || 'BND';

  return <main className="page search-page">
    <PageHeader eyebrow="Find anything" title="Search" description="Search your accounts, money activity, bills, goals, and Spaces." />
    {error && <div className="notice error">{error}</div>}

    <form className="search-main-form" onSubmit={submitSearch}>
      <input autoFocus value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Try: Wi-Fi, salary, school, BIBD…" aria-label="Search everything" />
      <button className="button primary" type="submit">Search</button>
    </form>

    <section className="search-filter-panel">
      <label>Type<select value={selectedKind} onChange={(event) => setSelectedKind(event.target.value as SearchKind | '')}><option value="">Everything</option><option value="account">Accounts</option><option value="money">Money activity</option><option value="bill">Bills & instalments</option><option value="goal">Goals</option><option value="space">Spaces</option></select></label>
      <label>Space<select value={selectedSpace} onChange={(event) => setSelectedSpace(event.target.value)}><option value="">All Spaces</option>{spaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Account<select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}><option value="">All accounts</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Status<select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as SearchStatus | '')}><option value="">Any status</option><option value="open">Open</option><option value="finished">Finished</option><option value="saved">Saved</option><option value="undone">Undone</option></select></label>
      <label>From date<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label>To date<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
      <button className="button secondary" type="button" onClick={() => { setSelectedKind(''); setSelectedSpace(''); setSelectedAccount(''); setSelectedStatus(''); setDateFrom(''); setDateTo(''); }}>Clear filters</button>
    </section>

    <section className="panel search-results-panel">
      <div className="panel-heading"><div><h2>{query ? `Results for “${query}”` : 'Everything'}</h2><p>{loading ? 'Loading…' : `${results.length} result${results.length === 1 ? '' : 's'}`}</p></div></div>
      {!loading && results.length ? <div className="search-results-list">{results.map((item) => <Link to={item.route} className="search-result-row" key={item.id}>
        <span className={`search-result-icon kind-${item.kind}`}>{item.kind === 'account' ? '◉' : item.kind === 'money' ? '↔' : item.kind === 'bill' ? '◷' : item.kind === 'goal' ? '◇' : '◫'}</span>
        <div><span className="type-badge">{kindLabel(item.kind)}</span><strong>{item.title}</strong><small>{item.detail}</small><small>{item.extra}</small></div>
        <aside>{typeof item.amountMinor === 'number' && <b>{formatMoney(item.amountMinor, item.currency || currency)}</b>}{item.date && <small>{item.date}</small>}<span>Open →</span></aside>
      </Link>)}</div> : !loading && <EmptyState title={query ? 'No matches found' : 'Nothing to search yet'} description={query ? 'Try a shorter word or clear some filters.' : 'Add accounts, money activity, bills, or goals and they will appear here.'} />}
    </section>
  </main>;
}
