import { useEffect, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { archiveSpace, createSpace, listSpaces, updateSpace } from '../../repositories/spaceRepository';
import type { Space, SpaceType } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

const labels: Record<SpaceType, string> = { personal: 'Personal', household: 'Household', sme: 'SME', trip: 'Trip', goal: 'Goal', custom: 'Custom' };

export function SpacesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try { setSpaces(await listSpaces(user.uid)); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const openEdit = (space: Space) => { setSelected(space); setModal('edit'); };
  return (
    <main className="page">
      <PageHeader eyebrow="Money groups" title="Spaces" description="Use Spaces to separate personal, household, trip, or business money." action={<button className="button primary" onClick={() => setModal('create')}>+ Add Space</button>} />
      {error && <div className="notice error">{error}</div>}
      <div className="info-banner"><strong>How Spaces work</strong><span>Choose a Space when recording money. The same account can be used in more than one Space.</span></div>
      {loading ? <div className="loading-panel">Loading Spaces…</div> : spaces.length === 0 ? <EmptyState title="No Spaces added yet" description="Your Personal Space will appear after onboarding." /> : (
        <section className="card-grid">
          {spaces.map((space) => {
            const open = () => navigate(`/spaces/${space.id}`);
            const stop = (event: MouseEvent<HTMLButtonElement>) => event.stopPropagation();
            const handleKey = (event: KeyboardEvent<HTMLElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
              }
            };
            return <article
              key={space.id}
              className={`space-card space-card-clickable ${space.archivedAt ? 'archived' : ''}`}
              role="link"
              tabIndex={0}
              onClick={open}
              onKeyDown={handleKey}
              aria-label={`Open ${space.name}`}
            >
              <div className="card-top"><span className={`space-icon large ${space.type}`}>{space.name.charAt(0)}</span><span className="type-badge">{labels[space.type]}</span></div>
              <h2>{space.name}</h2><p>{space.description || (space.type === 'personal' ? 'Your private money area.' : `A ${labels[space.type].toLowerCase()} area for its money activity.`)}</p>
              <div className="meta-row"><span>{space.currency}</span><span>{space.collaborationMode === 'private' ? 'Private' : 'Shared'}</span><span>{space.timezone}</span></div>
              <footer>
                <small>{space.displayId}</small>
                <div className="button-row">
                  <span className="space-open-label">Open Space →</span>
                  <button className="text-button" onClick={(event) => { stop(event); openEdit(space); }}>Edit</button>
                  {space.type !== 'personal' && !space.archivedAt && <button className="text-button danger" onClick={(event) => {
                    stop(event);
                    if (confirm(`Hide ${space.name}? Its previous money records will stay.`)) void archiveSpace(space.id).then(load);
                  }}>Hide</button>}
                </div>
              </footer>
            </article>;
          })}
        </section>
      )}
      {modal === 'create' && user && profile && <SpaceForm title="Add Space" submitLabel="Add Space" onClose={() => setModal(null)} onSubmit={async (values) => { await createSpace({ uid: user.uid, currency: profile.currency, timezone: profile.timezone, ...values }); setModal(null); await load(); }} />}
      {modal === 'edit' && selected && <SpaceForm title="Edit Space" submitLabel="Save changes" initial={selected} lockType onClose={() => setModal(null)} onSubmit={async (values) => { await updateSpace(selected.id, values); setModal(null); await load(); }} />}
    </main>
  );
}

function SpaceForm({ title, submitLabel, initial, lockType = false, onClose, onSubmit }: { title: string; submitLabel: string; initial?: Space; lockType?: boolean; onClose: () => void; onSubmit: (value: { name: string; type: Exclude<SpaceType, 'personal'>; description: string }) => Promise<void> }) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState<Exclude<SpaceType, 'personal'>>((initial?.type === 'personal' ? 'custom' : initial?.type) || 'household');
  const [description, setDescription] = useState(initial?.description || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await onSubmit({ name, type, description }); } catch (e) { setError(getErrorMessage(e)); } finally { setBusy(false); } };
  return <Modal title={title} onClose={onClose}><form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Space name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Our Household" /></label><label>Type<select disabled={lockType} value={type} onChange={(event) => setType(event.target.value as Exclude<SpaceType, 'personal'>)}><option value="household">Household</option><option value="sme">SME</option><option value="trip">Trip</option><option value="goal">Goal</option><option value="custom">Custom</option></select></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Optional details" /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div></form></Modal>;
}
