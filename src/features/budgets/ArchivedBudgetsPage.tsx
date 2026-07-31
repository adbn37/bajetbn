import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAllBudgets } from '../../repositories/budgetRepository';
import { manageBudget } from '../../repositories/lifecycleRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type { Budget, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

type Action = 'restore' | 'delete';

function archivedDate(item: Budget) {
  return item.archivedAt?.toDate?.().toLocaleDateString('en-BN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Date unavailable';
}

export function ArchivedBudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<LifecycleConfirmState<Budget, Action> | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const [nextBudgets, nextSpaces] = await Promise.all([listAllBudgets(user.uid), listSpaces(user.uid)]);
      setBudgets(nextBudgets.filter((item) => Boolean(item.archivedAt))); setSpaces(nextSpaces);
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const spaceMap = useMemo(() => new Map(spaces.map((item) => [item.id, item.name])), [spaces]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? budgets.filter((item) => `${item.name} ${item.categoryName || ''} ${spaceMap.get(item.spaceId) || ''}`.toLowerCase().includes(normalized)) : budgets;
  }, [budgets, query, spaceMap]);

  const ask = (budget: Budget, action: Action) => setDialog(action === 'restore'
    ? { record: budget, action, title: `Restore ${budget.name}?`, description: 'This budget will return to your current budgets. Its past spending will remain unchanged.', confirmLabel: 'Restore budget' }
    : { record: budget, action, title: `Delete ${budget.name} permanently?`, description: 'Permanent deletion only works when this budget has never been used by saved spending.', note: 'Budgets used in money activity or reports must remain archived.', confirmLabel: 'Delete permanently', tone: 'danger' });

  const run = async () => {
    if (!dialog) return;
    setBusy(true); setError('');
    try { await manageBudget(dialog.record.id, dialog.action); setDialog(null); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <main className="page archive-page">
    <PageHeader eyebrow="Budgets" title="Archived Budgets" description="Review older budgets without mixing them with your current spending plans." action={<Link className="button secondary" to="/budgets">← Back to Budgets</Link>} />
    {error && <div className="notice error">{error}</div>}
    <section className="archive-toolbar panel"><label className="archive-search">Search archived budgets<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search budget, Space, or category" /></label><span className="archive-count">{filtered.length} archived budget{filtered.length === 1 ? '' : 's'}</span></section>
    {loading ? <div className="loading-panel">Loading Archived Budgets…</div> : filtered.length === 0 ? <EmptyState title={budgets.length ? 'No matching archived budgets' : 'No archived budgets'} description={budgets.length ? 'Try another search.' : 'Budgets you archive will be kept here.'} /> : <section className="archive-card-grid">{filtered.map((budget) => { const ratio = budget.limitMinor > 0 ? Math.min(100, Math.round((budget.spentMinor / budget.limitMinor) * 100)) : 0; return <article className="archive-record-card" key={budget.id}>
      <div className="archive-record-heading"><div><span className="eyebrow">{spaceMap.get(budget.spaceId) || 'Space'}</span><h2>{budget.name}</h2><p>{budget.categoryName || 'All spending categories'}</p></div><span className="type-badge">{ratio}% used</span></div>
      <div className="budget-amount-line"><strong>{formatMoney(budget.spentMinor, budget.currency)}</strong><span>of {formatMoney(budget.limitMinor, budget.currency)}</span></div><div className="progress planning-progress"><span style={{ width: `${ratio}%` }} /></div>
      <dl className="archive-record-meta"><div><dt>Budget dates</dt><dd>{budget.startDate} → {budget.endDate}</dd></div><div><dt>Archived</dt><dd>{archivedDate(budget)}</dd></div></dl>
      <div className="archive-record-actions"><button className="button primary" onClick={() => ask(budget, 'restore')}>Restore</button><button className="text-button danger" onClick={() => ask(budget, 'delete')}>Delete permanently</button></div>
    </article>; })}</section>}
    {dialog && <LifecycleConfirmModal state={dialog} busy={busy} error={error} onClose={() => { setDialog(null); setError(''); }} onConfirm={() => void run()} />}
  </main>;
}
