import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { acceptSpaceInvitation, declineSpaceInvitation, listMySpaceInvitations } from '../../repositories/collaborationRepository';
import { manageSpace } from '../../repositories/lifecycleRepository';
import { createSpace, listSpaces, updateSpace } from '../../repositories/spaceRepository';
import type { Space, SpaceInvitation, SpaceType } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

const labels: Record<SpaceType, string> = { personal: 'Personal', household: 'Household', sme: 'SME', trip: 'Trip', goal: 'Goal', custom: 'Custom' };

export function SpacesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Space | null>(null);
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const email = (profile?.email || user.email || '').trim().toLowerCase();
      const [nextSpaces, nextInvitations] = await Promise.all([listSpaces(user.uid), listMySpaceInvitations(email)]);
      setSpaces(nextSpaces);
      setInvitations(nextInvitations);
    }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user, profile?.email]);

  const active = useMemo(() => spaces.filter((item) => !item.archivedAt), [spaces]);
  const archived = useMemo(() => spaces.filter((item) => item.archivedAt), [spaces]);
  const openEdit = (space: Space) => { setSelected(space); setModal('edit'); };
  const pendingInvitations = useMemo(() => invitations.filter((item) => item.status === 'pending'), [invitations]);

  async function answerInvitation(invitation: SpaceInvitation, decision: 'accept' | 'decline') {
    setBusyId(invitation.id); setError('');
    try {
      if (decision === 'accept') {
        const result = await acceptSpaceInvitation(invitation.token);
        await load();
        navigate(`/spaces/${result.spaceId}`);
        return;
      }
      await declineSpaceInvitation(invitation.id);
      await load();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusyId(''); }
  }

  async function lifecycle(space: Space, action: 'archive' | 'restore' | 'delete') {
    const message = action === 'archive'
      ? `Archive ${space.name}?\n\nIt will be hidden from normal use. Previous money records will stay available.`
      : action === 'delete'
        ? `Delete ${space.name}?\n\nThis only works when the Space has no members or saved history. This cannot be undone.`
        : `Restore ${space.name}?\n\nIt will appear in your Spaces again.`;
    if (!confirm(message)) return;
    setBusyId(space.id); setError('');
    try { await manageSpace(space.id, action); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusyId(''); }
  }

  return <main className="page">
    <PageHeader eyebrow="Money groups" title="Spaces" description="Use Spaces to separate personal, household, trip, or business money." action={<button className="button primary" onClick={() => setModal('create')}>+ Add Space</button>} />
    {error && <div className="notice error">{error}</div>}
    <div className="info-banner"><strong>Safe Space removal</strong><span>Empty Spaces can be deleted. Spaces with members or money history can be archived and restored later.</span></div>
    {pendingInvitations.length > 0 && <section className="panel incoming-invitations-panel"><div className="panel-heading"><div><span className="eyebrow">Invitations for me</span><h2>Spaces you can join</h2></div><span className="type-badge">{pendingInvitations.length}</span></div><div className="incoming-invitation-list">{pendingInvitations.map((invitation) => { const expired = Boolean(invitation.expiresAt?.toDate?.().getTime() && invitation.expiresAt.toDate().getTime() < Date.now()); return <article className="incoming-invitation-row" key={invitation.id}><div><strong>{invitation.spaceName || 'Shared Space'}</strong><span>{invitation.spaceType ? `${labels[invitation.spaceType]} Space` : 'Shared Space'} · Invited by {invitation.invitedByName || 'the Space owner'}</span><small>Access: {invitation.role === 'admin' ? 'Manager' : invitation.role === 'viewer' ? 'View only' : invitation.role === 'payer' ? 'Can pay' : 'Can add'}{expired ? ' · Invite expired' : ''}</small></div><div className="button-row">{expired ? <span className="status-pill">Ask for a new invite</span> : <><button className="button primary" disabled={busyId === invitation.id} onClick={() => void answerInvitation(invitation, 'accept')}>{busyId === invitation.id ? 'Working…' : 'Join Space'}</button><button className="button secondary" disabled={busyId === invitation.id} onClick={() => void answerInvitation(invitation, 'decline')}>Decline</button></>}</div></article>; })}</div></section>}
    {loading ? <div className="loading-panel">Loading Spaces…</div> : active.length === 0 ? <EmptyState title="No active Spaces" description="Add a Space or restore one from Archived Spaces below." /> : <SpaceGrid spaces={active} busyId={busyId} navigate={navigate} onEdit={openEdit} onArchive={(space) => void lifecycle(space, 'archive')} onDelete={(space) => void lifecycle(space, 'delete')} />}

    {archived.length > 0 && <section className="panel archived-items-panel"><div className="panel-heading"><div><span className="eyebrow">Hidden from normal use</span><h2>Archived Spaces</h2></div><span className="type-badge">{archived.length}</span></div><section className="card-grid">{archived.map((space) => <article key={space.id} className="space-card archived"><div className="card-top"><span className={`space-icon large ${space.type}`}>{space.name.charAt(0)}</span><span className="type-badge">{labels[space.type]}</span></div><h2>{space.name}</h2><p>Previous records are kept.</p><footer><small>{space.displayId}</small><button className="button secondary" disabled={busyId === space.id} onClick={() => void lifecycle(space, 'restore')}>{busyId === space.id ? 'Working…' : 'Restore Space'}</button></footer></article>)}</section></section>}

    {modal === 'create' && user && profile && <SpaceForm title="Add Space" submitLabel="Add Space" onClose={() => setModal(null)} onSubmit={async (values) => { await createSpace({ uid: user.uid, currency: profile.currency, timezone: profile.timezone, ...values }); setModal(null); await load(); }} />}
    {modal === 'edit' && selected && <SpaceForm title="Edit Space" submitLabel="Save changes" initial={selected} lockType onClose={() => setModal(null)} onSubmit={async (values) => { await updateSpace(selected.id, values); setModal(null); await load(); }} />}
  </main>;
}

function SpaceGrid({ spaces, busyId, navigate, onEdit, onArchive, onDelete }: { spaces: Space[]; busyId: string; navigate: ReturnType<typeof useNavigate>; onEdit: (space: Space) => void; onArchive: (space: Space) => void; onDelete: (space: Space) => void }) {
  return <section className="card-grid">{spaces.map((space) => {
    const open = () => navigate(`/spaces/${space.id}`);
    const stop = (event: MouseEvent<HTMLButtonElement>) => event.stopPropagation();
    const handleKey = (event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
    return <article key={space.id} className="space-card space-card-clickable" role="link" tabIndex={0} onClick={open} onKeyDown={handleKey} aria-label={`Open ${space.name}`}>
      <div className="card-top"><span className={`space-icon large ${space.type}`}>{space.name.charAt(0)}</span><span className="type-badge">{labels[space.type]}</span></div>
      <h2>{space.name}</h2><p>{space.description || (space.type === 'personal' ? 'Your private money area.' : `A ${labels[space.type].toLowerCase()} area for its money activity.`)}</p>
      <div className="meta-row"><span>{space.currency}</span><span>{space.collaborationMode === 'private' ? 'Private' : 'Shared'}</span><span>{space.timezone}</span></div>
      <footer><small>{space.displayId}</small><div className="button-row"><span className="space-open-label">Open Space →</span><button className="text-button" onClick={(event) => { stop(event); onEdit(space); }}>Edit</button>{space.type !== 'personal' && <><button className="text-button" disabled={busyId === space.id} onClick={(event) => { stop(event); onArchive(space); }}>Archive</button><button className="text-button danger" disabled={busyId === space.id} onClick={(event) => { stop(event); onDelete(space); }}>Delete</button></>}</div></footer>
    </article>;
  })}</section>;
}

function SpaceForm({ title, submitLabel, initial, lockType = false, onClose, onSubmit }: { title: string; submitLabel: string; initial?: Space; lockType?: boolean; onClose: () => void; onSubmit: (value: { name: string; type: Exclude<SpaceType, 'personal'>; description: string }) => Promise<void> }) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState<Exclude<SpaceType, 'personal'>>((initial?.type === 'personal' ? 'custom' : initial?.type) || 'household');
  const [description, setDescription] = useState(initial?.description || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await onSubmit({ name, type, description }); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <Modal title={title} onClose={onClose}><form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Space name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Our Household" /></label><label>Type<select disabled={lockType} value={type} onChange={(event) => setType(event.target.value as Exclude<SpaceType, 'personal'>)}><option value="household">Household</option><option value="sme">SME</option><option value="trip">Trip</option><option value="goal">Goal</option><option value="custom">Custom</option></select></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div></form></Modal>;
}
