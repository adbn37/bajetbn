import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { manageSpace } from '../../repositories/lifecycleRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type { Space, SpaceType } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

const labels: Record<SpaceType, string> = { personal: 'Personal', household: 'Household', sme: 'SME', trip: 'Trip', goal: 'Goal', custom: 'Custom', collection: 'Collection' };
type Action = 'restore' | 'delete';

function archivedDate(space: Space) {
  return space.archivedAt?.toDate?.().toLocaleDateString('en-BN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Date unavailable';
}

export function ArchivedSpacesPage() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<LifecycleConfirmState<Space, Action> | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try { setSpaces((await listSpaces(user.uid)).filter((item) => Boolean(item.archivedAt))); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? spaces.filter((item) => `${item.name} ${item.description || ''} ${labels[item.type]}`.toLowerCase().includes(normalized)) : spaces;
  }, [query, spaces]);

  const ask = (space: Space, action: Action) => setDialog(action === 'restore'
    ? { record: space, action, title: `Restore ${space.name}?`, description: 'This Space will return to your active Spaces and can be used again.', confirmLabel: 'Restore Space' }
    : { record: space, action, title: `Delete ${space.name} permanently?`, description: 'Permanent deletion only works when this Space is empty and has no saved history.', note: 'Previous money records, members, invitations, or activity will prevent deletion.', confirmLabel: 'Delete permanently', tone: 'danger' });

  const run = async () => {
    if (!dialog) return;
    setBusy(true); setError('');
    try { await manageSpace(dialog.record.id, dialog.action); setDialog(null); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <main className="page archive-page">
    <PageHeader eyebrow="Spaces" title="Archived Spaces" description="View older Spaces without mixing them with the Spaces you currently use." action={<Link className="button secondary" to="/spaces">← Back to Spaces</Link>} />
    {error && <div className="notice error">{error}</div>}
    <section className="archive-toolbar panel">
      <label className="archive-search">Search archived Spaces<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or type" /></label>
      <span className="archive-count">{filtered.length} archived Space{filtered.length === 1 ? '' : 's'}</span>
    </section>
    {loading ? <div className="loading-panel">Loading Archived Spaces…</div> : filtered.length === 0 ? <EmptyState title={spaces.length ? 'No matching archived Spaces' : 'No archived Spaces'} description={spaces.length ? 'Try another search.' : 'Spaces you archive will be kept here.'} /> : <section className="archive-card-grid">{filtered.map((space) => <article className="archive-record-card" key={space.id}>
      <div className="archive-record-main"><span className={`space-icon large ${space.type}`}>{space.name.charAt(0)}</span><div><span className="eyebrow">{labels[space.type]}</span><h2>{space.name}</h2><p>{space.description || 'Previous records are kept.'}</p></div></div>
      <dl className="archive-record-meta"><div><dt>Archived</dt><dd>{archivedDate(space)}</dd></div><div><dt>Record</dt><dd>{space.displayId}</dd></div></dl>
      <div className="archive-record-actions"><Link className="button secondary" to={`/spaces/${space.id}`}>View records</Link><button className="button primary" onClick={() => ask(space, 'restore')}>Restore</button><button className="text-button danger" onClick={() => ask(space, 'delete')}>Delete permanently</button></div>
    </article>)}</section>}
    {dialog && <LifecycleConfirmModal state={dialog} busy={busy} error={error} onClose={() => { setDialog(null); setError(''); }} onConfirm={() => void run()} />}
  </main>;
}
