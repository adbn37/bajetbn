import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { acceptSpaceInvitation, declineSpaceInvitation, listMySpaceInvitations } from '../../repositories/collaborationRepository';
import { manageSpace } from '../../repositories/lifecycleRepository';
import { createSpace, listSpaces, updateSpace } from '../../repositories/spaceRepository';
import type { Space, SpaceInvitation, SpaceType } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

const labels: Record<SpaceType, string> = { personal: 'Personal', household: 'Household', sme: 'SME', trip: 'Trip', goal: 'Goal', custom: 'Custom', collection: 'Collection' };
type SpaceLifecycleAction = 'archive' | 'delete';

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
  const [lifecycleDialog, setLifecycleDialog] = useState<LifecycleConfirmState<Space, SpaceLifecycleAction> | null>(null);

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

  function askLifecycle(space: Space, action: SpaceLifecycleAction) {
    setError('');
    setLifecycleDialog(action === 'archive'
      ? {
          record: space,
          action,
          title: space.type === 'trip' ? `Close ${space.name}?` : `Archive ${space.name}?`,
          description: 'It will move to Archived Spaces and disappear from normal use.',
          note: 'Previous money records, members, balances, and activity will stay available.',
          confirmLabel: space.type === 'trip' ? 'Close Trip' : 'Archive Space',
        }
      : {
          record: space,
          action,
          title: `Delete ${space.name} permanently?`,
          description: 'Permanent deletion only works when this Space is empty and has no saved history.',
          note: 'This cannot be undone.',
          confirmLabel: 'Delete permanently',
          tone: 'danger',
        });
  }

  async function runLifecycle() {
    if (!lifecycleDialog) return;
    const { record: space, action } = lifecycleDialog;
    setBusyId(space.id); setError('');
    try {
      await manageSpace(space.id, action);
      setLifecycleDialog(null);
      await load();
    } catch (nextError) {
      const message = getErrorMessage(nextError);
      if (action === 'delete' && /archive/i.test(message)) {
        setLifecycleDialog({
          record: space,
          action: 'archive',
          title: `${space.name} cannot be deleted`,
          description: message,
          note: 'Archive it instead. It will be hidden from normal use while its previous records stay correct.',
          confirmLabel: space.type === 'trip' ? 'Close Trip instead' : 'Archive Space instead',
        });
      } else setError(message);
    } finally { setBusyId(''); }
  }


  return <main className="page">
    <PageHeader eyebrow="Money groups" title="Spaces" description="Use Spaces to separate personal, household, trip, business, or collection records." action={<div className="page-header-action-row"><Link className="button secondary archive-button" to="/spaces/archived">Archived Spaces <span>{archived.length}</span></Link><button className="button primary" onClick={() => setModal('create')}>+ Add Space</button></div>} />
    {error && <div className="notice error">{error}</div>}
    <div className="info-banner"><strong>Safe Space removal</strong><span>Empty Spaces can be deleted. Spaces with members or money history can be archived and restored later.</span></div>
    {pendingInvitations.length > 0 && <section className="panel incoming-invitations-panel"><div className="panel-heading"><div><span className="eyebrow">Invitations for me</span><h2>Spaces you can join</h2></div><span className="type-badge">{pendingInvitations.length}</span></div><div className="incoming-invitation-list">{pendingInvitations.map((invitation) => { const expired = Boolean(invitation.expiresAt?.toDate?.().getTime() && invitation.expiresAt.toDate().getTime() < Date.now()); return <article className="incoming-invitation-row" key={invitation.id}><div><strong>{invitation.spaceName || 'Shared Space'}</strong><span>{invitation.spaceType ? `${labels[invitation.spaceType]} Space` : 'Shared Space'} · Invited by {invitation.invitedByName || 'the Space owner'}</span><small>Access: {invitation.role === 'admin' ? 'Manager' : invitation.role === 'viewer' ? 'View only' : invitation.role === 'payer' ? 'Can pay' : 'Can add'}{expired ? ' · Invite expired' : ''}</small></div><div className="button-row">{expired ? <span className="status-pill">Ask for a new invite</span> : <><button className="button primary" disabled={busyId === invitation.id} onClick={() => void answerInvitation(invitation, 'accept')}>{busyId === invitation.id ? 'Working…' : 'Join Space'}</button><button className="button secondary" disabled={busyId === invitation.id} onClick={() => void answerInvitation(invitation, 'decline')}>Decline</button></>}</div></article>; })}</div></section>}
    {loading ? <div className="loading-panel">Loading Spaces…</div> : active.length === 0 ? <EmptyState title="No active Spaces" description="Add a Space or restore one from the Archived Spaces page." /> : <SpaceGrid spaces={active} busyId={busyId} navigate={navigate} onEdit={openEdit} onArchive={(space) => askLifecycle(space, 'archive')} onDelete={(space) => askLifecycle(space, 'delete')} />}


    {lifecycleDialog && <LifecycleConfirmModal state={lifecycleDialog} busy={busyId === lifecycleDialog.record.id} error={error} onClose={() => { setLifecycleDialog(null); setError(''); }} onConfirm={() => void runLifecycle()} />}
    {modal === 'create' && user && profile && <SpaceForm title="Add Space" submitLabel="Add Space" onClose={() => setModal(null)} onSubmit={async (values) => { await createSpace({ uid: user.uid, currency: profile.currency, timezone: profile.timezone, ...values }); setModal(null); await load(); }} />}
    {modal === 'edit' && selected && <SpaceForm title="Edit Space" submitLabel="Save changes" initial={selected} lockType onClose={() => setModal(null)} onSubmit={async (values) => { await updateSpace(selected.id, values); setModal(null); await load(); }} />}
  </main>;
}

function SpaceGrid({ spaces, busyId, navigate, onEdit, onArchive, onDelete }: { spaces: Space[]; busyId: string; navigate: ReturnType<typeof useNavigate>; onEdit: (space: Space) => void; onArchive: (space: Space) => void; onDelete: (space: Space) => void }) {
  return <section className="card-grid spaces-card-grid">{spaces.map((space) => {
    const open = () => navigate(`/spaces/${space.id}`);
    const openPos = () => navigate(`/spaces/${space.id}/pos`);
    const stop = (event: MouseEvent<HTMLButtonElement>) => event.stopPropagation();
    const handleKey = (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    };

    return <article
      key={space.id}
      className={`space-card space-card-clickable space-card-compact ${space.type === 'sme' ? 'space-card-sme' : ''}`}
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={handleKey}
      aria-label={`Open ${space.name}`}
    >
      <div className="card-top">
        <span className={`space-icon large ${space.type}`}>{space.name.charAt(0).toUpperCase()}</span>
        <span className="type-badge">{labels[space.type]}</span>
      </div>

      <div className="space-card-copy">
        <h2>{space.name}</h2>
        <p>{space.description || (space.type === 'personal'
          ? 'Your private money area.'
          : `A ${labels[space.type].toLowerCase()} area for its money activity.`)}</p>
      </div>

      <div className="meta-row">
        <span>{space.currency}</span>
        <span>{space.collaborationMode === 'private' ? 'Private' : 'Shared'}</span>
        <span>{space.timezone}</span>
      </div>

      <footer>
        <small>{space.displayId}</small>

        <div className="space-card-primary-actions">
          {space.type === 'sme' && <button
            type="button"
            className="space-pos-shortcut"
            onClick={(event) => {
              stop(event);
              openPos();
            }}
          >
            POS
          </button>}

          <span className="space-open-label">Open →</span>

          <details
            className="space-card-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <summary aria-label={`Manage ${space.name}`}>•••</summary>

            <div className="space-card-menu-popover">
              <button
                type="button"
                onClick={(event) => {
                  stop(event);
                  onEdit(space);
                }}
              >
                Edit Space
              </button>

              {space.type !== 'personal' && <>
                <button
                  type="button"
                  disabled={busyId === space.id}
                  onClick={(event) => {
                    stop(event);
                    onArchive(space);
                  }}
                >
                  Archive
                </button>

                <button
                  type="button"
                  className="danger"
                  disabled={busyId === space.id}
                  onClick={(event) => {
                    stop(event);
                    onDelete(space);
                  }}
                >
                  Delete
                </button>
              </>}
            </div>
          </details>
        </div>
      </footer>
    </article>;
  })}</section>;
}

function SpaceForm({ title, submitLabel, initial, lockType = false, onClose, onSubmit }: { title: string; submitLabel: string; initial?: Space; lockType?: boolean; onClose: () => void; onSubmit: (value: { name: string; type: Exclude<SpaceType, 'personal'>; description: string }) => Promise<void> }) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState<Exclude<SpaceType, 'personal'>>((initial?.type === 'personal' ? 'custom' : initial?.type) || 'household');
  const [description, setDescription] = useState(initial?.description || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await onSubmit({ name, type, description }); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <Modal title={title} onClose={onClose}><form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Space name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Our Household" /></label><label>Type<select disabled={lockType} value={type} onChange={(event) => setType(event.target.value as Exclude<SpaceType, 'personal'>)}><option value="household">Household</option><option value="sme">SME</option><option value="trip">Trip</option><option value="goal">Goal</option><option value="collection">Collection</option><option value="custom">Custom</option></select></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div></form></Modal>;
}
