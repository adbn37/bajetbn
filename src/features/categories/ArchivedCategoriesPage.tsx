import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAllCustomCategories } from '../../repositories/categoryRepository';
import { manageCategory } from '../../repositories/lifecycleRepository';
import type { TransactionCategory } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { categoryIconGlyph } from './defaultCategories';

type Action = 'restore' | 'delete';

function archivedDate(item: TransactionCategory) {
  return item.archivedAt?.toDate?.().toLocaleDateString('en-BN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Date unavailable';
}

export function ArchivedCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<LifecycleConfirmState<TransactionCategory, Action> | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try { setCategories((await listAllCustomCategories(user.uid)).filter((item) => Boolean(item.archivedAt))); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? categories.filter((item) => `${item.name} ${item.kind} ${item.scope}`.toLowerCase().includes(normalized)) : categories;
  }, [categories, query]);

  const ask = (category: TransactionCategory, action: Action) => setDialog(action === 'restore'
    ? { record: category, action, title: `Restore ${category.name}?`, description: 'This category will appear in new money activity forms again. Past records will remain unchanged.', confirmLabel: 'Restore category' }
    : { record: category, action, title: `Delete ${category.name} permanently?`, description: 'Permanent deletion only works when this category has never been used by transactions, budgets, bills, or instalments.', note: 'Used categories must stay hidden so previous reports keep the correct category name.', confirmLabel: 'Delete permanently', tone: 'danger' });

  const run = async () => {
    if (!dialog) return;
    setBusy(true); setError('');
    try { await manageCategory(dialog.record.id, dialog.action); setDialog(null); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <main className="page archive-page">
    <PageHeader eyebrow="Money activity" title="Hidden Categories" description="Manage custom categories that no longer appear in new money activity forms." action={<Link className="button secondary" to="/transactions">← Back to Money Activity</Link>} />
    {error && <div className="notice error">{error}</div>}
    <section className="archive-toolbar panel"><label className="archive-search">Search hidden categories<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or type" /></label><span className="archive-count">{filtered.length} hidden categor{filtered.length === 1 ? 'y' : 'ies'}</span></section>
    {loading ? <div className="loading-panel">Loading Hidden Categories…</div> : filtered.length === 0 ? <EmptyState title={categories.length ? 'No matching hidden categories' : 'No hidden categories'} description={categories.length ? 'Try another search.' : 'Custom categories you hide will be kept here.'} /> : <section className="archive-card-grid">{filtered.map((category) => <article className="archive-record-card" key={category.id}>
      <div className="archive-record-main"><span className={`category-icon category-${category.color}`}>{categoryIconGlyph(category.icon)}</span><div><span className="eyebrow">{category.kind === 'income' ? 'Money in' : 'Money out'} · {category.scope}</span><h2>{category.name}</h2><p>Hidden from new forms. Previous records still use this name.</p></div></div>
      <dl className="archive-record-meta"><div><dt>Hidden</dt><dd>{archivedDate(category)}</dd></div><div><dt>Type</dt><dd>{category.scope === 'both' ? 'Personal & business' : category.scope}</dd></div></dl>
      <div className="archive-record-actions"><button className="button primary" onClick={() => ask(category, 'restore')}>Restore</button><button className="text-button danger" onClick={() => ask(category, 'delete')}>Delete permanently</button></div>
    </article>)}</section>}
    {dialog && <LifecycleConfirmModal state={dialog} busy={busy} error={error} onClose={() => { setDialog(null); setError(''); }} onConfirm={() => void run()} />}
  </main>;
}
