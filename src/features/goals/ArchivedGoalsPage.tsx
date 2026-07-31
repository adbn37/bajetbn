import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAllGoals } from '../../repositories/goalRepository';
import { manageGoal } from '../../repositories/lifecycleRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type { SavingsGoal, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

type Action = 'restore' | 'delete';

function inactiveDate(item: SavingsGoal) {
  return (item.closedAt || item.archivedAt)?.toDate?.().toLocaleDateString('en-BN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Date unavailable';
}

export function ArchivedGoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<LifecycleConfirmState<SavingsGoal, Action> | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const [nextGoals, nextSpaces] = await Promise.all([listAllGoals(user.uid), listSpaces(user.uid)]);
      setGoals(nextGoals.filter((item) => Boolean(item.archivedAt || item.closedAt))); setSpaces(nextSpaces);
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const spaceMap = useMemo(() => new Map(spaces.map((item) => [item.id, item.name])), [spaces]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? goals.filter((item) => `${item.name} ${item.note || ''} ${spaceMap.get(item.spaceId) || ''}`.toLowerCase().includes(normalized)) : goals;
  }, [goals, query, spaceMap]);

  const ask = (goal: SavingsGoal, action: Action) => setDialog(action === 'restore'
    ? { record: goal, action, title: `Restore ${goal.name}?`, description: 'This goal will return to your current goals and can receive new progress again.', confirmLabel: 'Restore goal' }
    : { record: goal, action, title: `Delete ${goal.name} permanently?`, description: 'Permanent deletion only works when no progress has ever been saved for this goal.', note: 'Goals with contributions must remain closed or archived so savings history stays correct.', confirmLabel: 'Delete permanently', tone: 'danger' });

  const run = async () => {
    if (!dialog) return;
    setBusy(true); setError('');
    try { await manageGoal(dialog.record.id, dialog.action); setDialog(null); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <main className="page archive-page">
    <PageHeader eyebrow="Savings goals" title="Closed & Archived Goals" description="Keep previous savings targets and their progress away from the goals you currently use." action={<Link className="button secondary" to="/goals">← Back to Goals</Link>} />
    {error && <div className="notice error">{error}</div>}
    <section className="archive-toolbar panel"><label className="archive-search">Search previous goals<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search goal or Space" /></label><span className="archive-count">{filtered.length} previous goal{filtered.length === 1 ? '' : 's'}</span></section>
    {loading ? <div className="loading-panel">Loading Previous Goals…</div> : filtered.length === 0 ? <EmptyState title={goals.length ? 'No matching goals' : 'No closed or archived goals'} description={goals.length ? 'Try another search.' : 'Goals you close or archive will be kept here.'} /> : <section className="archive-card-grid">{filtered.map((goal) => { const ratio = goal.targetMinor ? Math.min(100, Math.round((goal.currentMinor / goal.targetMinor) * 100)) : 0; return <article className="archive-record-card" key={goal.id}>
      <div className="archive-record-heading"><div><span className="eyebrow">{goal.closedAt ? 'Closed' : 'Archived'} · {spaceMap.get(goal.spaceId) || 'Space'}</span><h2>{goal.name}</h2><p>{goal.note || (goal.targetDate ? `Target date ${goal.targetDate}` : 'No target date')}</p></div><span className="type-badge">{ratio}%</span></div>
      <div className="budget-amount-line"><strong>{formatMoney(goal.currentMinor, goal.currency)}</strong><span>of {formatMoney(goal.targetMinor, goal.currency)}</span></div><div className="progress planning-progress"><span style={{ width: `${ratio}%` }} /></div>
      <dl className="archive-record-meta"><div><dt>Status date</dt><dd>{inactiveDate(goal)}</dd></div><div><dt>Still needed</dt><dd>{formatMoney(Math.max(0, goal.targetMinor - goal.currentMinor), goal.currency)}</dd></div></dl>
      <div className="archive-record-actions"><button className="button primary" onClick={() => ask(goal, 'restore')}>Restore</button><button className="text-button danger" onClick={() => ask(goal, 'delete')}>Delete permanently</button></div>
    </article>; })}</section>}
    {dialog && <LifecycleConfirmModal state={dialog} busy={busy} error={error} onClose={() => { setDialog(null); setError(''); }} onConfirm={() => void run()} />}
  </main>;
}
