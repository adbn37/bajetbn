import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAllCommitments } from '../../repositories/commitmentRepository';
import { manageCommitment } from '../../repositories/lifecycleRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type { Commitment, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

type Action = 'restore' | 'delete';

function inactiveDate(item: Commitment) {
  return (item.stoppedAt || item.archivedAt)?.toDate?.().toLocaleDateString('en-BN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Date unavailable';
}

export function ArchivedCommitmentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Commitment[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<LifecycleConfirmState<Commitment, Action> | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const [nextItems, nextSpaces] = await Promise.all([listAllCommitments(user.uid), listSpaces(user.uid)]);
      setItems(nextItems.filter((item) => Boolean(item.archivedAt || item.stoppedAt))); setSpaces(nextSpaces);
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const spaceMap = useMemo(() => new Map(spaces.map((item) => [item.id, item.name])), [spaces]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? items.filter((item) => `${item.name} ${item.payee || ''} ${item.categoryName} ${spaceMap.get(item.spaceId) || ''}`.toLowerCase().includes(normalized)) : items;
  }, [items, query, spaceMap]);

  const ask = (item: Commitment, action: Action) => setDialog(action === 'restore'
    ? { record: item, action, title: `Restore ${item.name}?`, description: 'Future due dates will continue from the saved schedule. Previous payments will remain unchanged.', confirmLabel: `Restore ${item.type === 'bill' ? 'bill' : 'instalment'}` }
    : { record: item, action, title: `Delete ${item.name} permanently?`, description: 'Permanent deletion only works when this item has no payment history and has never been shared.', note: 'Items with previous payments must remain stopped so reports and account history stay correct.', confirmLabel: 'Delete permanently', tone: 'danger' });

  const run = async () => {
    if (!dialog) return;
    setBusy(true); setError('');
    try { await manageCommitment(dialog.record.id, dialog.action); setDialog(null); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <main className="page archive-page">
    <PageHeader eyebrow="Bills & instalments" title="Stopped Bills & Instalments" description="Review inactive payment plans without mixing them with bills that still have future due dates." action={<Link className="button secondary" to="/bills">← Back to Bills</Link>} />
    {error && <div className="notice error">{error}</div>}
    <section className="archive-toolbar panel"><label className="archive-search">Search stopped items<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, payee, or Space" /></label><span className="archive-count">{filtered.length} stopped item{filtered.length === 1 ? '' : 's'}</span></section>
    {loading ? <div className="loading-panel">Loading Stopped Items…</div> : filtered.length === 0 ? <EmptyState title={items.length ? 'No matching stopped items' : 'No stopped bills or instalments'} description={items.length ? 'Try another search.' : 'Bills and instalments you stop will be kept here.'} /> : <section className="archive-card-grid">{filtered.map((item) => { const remaining = item.type === 'instalment' && item.totalAmountMinor ? Math.max(0, item.totalAmountMinor - item.amountPaidMinor) : 0; return <article className="archive-record-card" key={item.id}>
      <div className="archive-record-heading"><div><span className="eyebrow">{item.type === 'bill' ? 'Bill' : 'Instalment'} · {spaceMap.get(item.spaceId) || 'Space'}</span><h2>{item.name}</h2><p>{item.payee || item.categoryName}</p></div><span className="type-badge">Stopped</span></div>
      <div className="budget-amount-line"><span>{item.type === 'bill' ? 'Amount each cycle' : 'Instalment each cycle'}</span><strong>{formatMoney(item.amountMinor, item.currency)}</strong></div>
      <dl className="archive-record-meta"><div><dt>Stopped</dt><dd>{inactiveDate(item)}</dd></div><div><dt>{item.type === 'instalment' ? 'Amount left' : 'Last due date'}</dt><dd>{item.type === 'instalment' ? formatMoney(remaining, item.currency) : item.stoppedPreviousNextDueDate || 'Not available'}</dd></div></dl>
      <div className="archive-record-actions"><button className="button primary" onClick={() => ask(item, 'restore')}>Restore</button><button className="text-button danger" onClick={() => ask(item, 'delete')}>Delete permanently</button></div>
    </article>; })}</section>}
    {dialog && <LifecycleConfirmModal state={dialog} busy={busy} error={error} onClose={() => { setDialog(null); setError(''); }} onConfirm={() => void run()} />}
  </main>;
}
