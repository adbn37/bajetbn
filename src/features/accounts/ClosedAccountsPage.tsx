import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAllAccounts } from '../../repositories/accountRepository';
import { manageAccount } from '../../repositories/lifecycleRepository';
import type { Account, AccountType } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

const accountLabels: Record<AccountType, string> = { bank: 'Bank', cash: 'Cash', e_wallet: 'E-wallet', credit_card: 'Credit card' };
type Action = 'restore' | 'delete';

function closedDate(account: Account) {
  return (account.closedAt || account.archivedAt)?.toDate?.().toLocaleDateString('en-BN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Date unavailable';
}

export function ClosedAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<LifecycleConfirmState<Account, Action> | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try { setAccounts((await listAllAccounts(user.uid)).filter((item) => Boolean(item.archivedAt || item.closedAt))); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? accounts.filter((item) => `${item.name} ${item.institution || ''} ${accountLabels[item.type]}`.toLowerCase().includes(normalized)) : accounts;
  }, [accounts, query]);

  const ask = (account: Account, action: Action) => setDialog(action === 'restore'
    ? { record: account, action, title: `Reopen ${account.name}?`, description: 'This account will be available for new money activity again. Its saved balance and previous records will stay unchanged.', confirmLabel: 'Reopen account' }
    : { record: account, action, title: `Delete ${account.name} permanently?`, description: 'Permanent deletion only works when this account has never been used for saved money activity.', note: 'Accounts with financial history must remain closed so old balances and reports stay correct.', confirmLabel: 'Delete permanently', tone: 'danger' });

  const run = async () => {
    if (!dialog) return;
    setBusy(true); setError('');
    try { await manageAccount(dialog.record.id, dialog.action); setDialog(null); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <main className="page archive-page">
    <PageHeader eyebrow="Accounts" title="Closed Accounts" description="Keep old bank, cash, e-wallet, and card records without showing them in normal payment forms." action={<Link className="button secondary" to="/accounts">← Back to Accounts</Link>} />
    {error && <div className="notice error">{error}</div>}
    <section className="archive-toolbar panel"><label className="archive-search">Search closed accounts<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or institution" /></label><span className="archive-count">{filtered.length} closed account{filtered.length === 1 ? '' : 's'}</span></section>
    {loading ? <div className="loading-panel">Loading Closed Accounts…</div> : filtered.length === 0 ? <EmptyState title={accounts.length ? 'No matching closed accounts' : 'No closed accounts'} description={accounts.length ? 'Try another search.' : 'Accounts you close will be kept here.'} /> : <section className="archive-card-grid">{filtered.map((account) => <article className="archive-record-card" key={account.id}>
      <div className="archive-record-main"><span className={`account-symbol large ${account.type}`}>{account.name.charAt(0)}</span><div><span className="eyebrow">{accountLabels[account.type]}</span><h2>{account.name}</h2><p>{account.institution || accountLabels[account.type]} · {account.classification === 'business' ? 'Business' : 'Personal'}</p></div></div>
      <dl className="archive-record-meta"><div><dt>Last balance</dt><dd>{formatMoney(account.ledgerBalanceMinor, account.currency)}</dd></div><div><dt>Closed</dt><dd>{closedDate(account)}</dd></div></dl>
      <div className="archive-record-actions"><Link className="button secondary" to={`/transactions?accountId=${encodeURIComponent(account.id)}`}>View activity</Link><button className="button primary" onClick={() => ask(account, 'restore')}>Reopen</button><button className="text-button danger" onClick={() => ask(account, 'delete')}>Delete permanently</button></div>
    </article>)}</section>}
    {dialog && <LifecycleConfirmModal state={dialog} busy={busy} error={error} onClose={() => { setDialog(null); setError(''); }} onConfirm={() => void run()} />}
  </main>;
}
