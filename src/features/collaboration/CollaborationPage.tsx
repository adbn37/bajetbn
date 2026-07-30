import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  createSharedBillAssignment,
  createSpaceInvitation,
  getSharedBillProofUrl,
  listSharedBillAssignments,
  listSpaceActivities,
  listSpaceCommitments,
  listSpaceInvitations,
  listSpaceMembers,
  listUserNotifications,
  markNotificationRead,
  removeSpaceMember,
  reviewSharedBillPayment,
  revokeSpaceInvitation,
  submitSharedBillPayment,
  updateSpaceCollaborationSettings,
  updateSpaceMember,
  uploadSharedBillProof,
} from '../../repositories/collaborationRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type {
  Commitment,
  SharedBillAssignment,
  Space,
  SpaceActivity,
  SpaceInvitation,
  SpaceMember,
  SpaceRole,
  UserNotification,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

const editableRoles: Array<Exclude<SpaceRole, 'owner' | 'member'>> = ['admin', 'contributor', 'payer', 'viewer'];
const roleLabel: Record<string, string> = { owner: 'Owner', admin: 'Admin', contributor: 'Contributor', payer: 'Payer', viewer: 'Viewer', member: 'Member' };
function today() { return new Date().toISOString().slice(0, 10); }
function inviteUrl(token: string) { return `${window.location.origin}/join?token=${encodeURIComponent(token)}`; }
function whatsappHref(number: string, message: string) {
  const digits = number.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : '';
}

export function CollaborationPage() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState('');
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [assignments, setAssignments] = useState<SharedBillAssignment[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [activities, setActivities] = useState<SpaceActivity[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [tab, setTab] = useState<'members' | 'bills' | 'activity'>('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<SpaceMember | null>(null);
  const [submitting, setSubmitting] = useState<SharedBillAssignment | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedSpace = spaces.find((item) => item.id === spaceId) || null;
  const currentMember = members.find((item) => item.uid === user?.uid) || null;
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const canAssign = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const loadSpaces = async () => {
    if (!user) return;
    const next = (await listSpaces(user.uid)).filter((item) => !item.archivedAt && item.type !== 'personal');
    setSpaces(next);
    setSpaceId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id || '');
  };

  const loadSpaceData = async (selectedId: string) => {
    if (!user || !selectedId) return;
    setLoading(true); setError('');
    try {
      const [nextMembers, nextInvitations, nextAssignments, nextCommitments, nextActivities, nextNotifications] = await Promise.all([
        listSpaceMembers(selectedId),
        listSpaceInvitations(selectedId),
        listSharedBillAssignments(selectedId),
        listSpaceCommitments(selectedId),
        listSpaceActivities(selectedId),
        listUserNotifications(user.uid),
      ]);
      setMembers(nextMembers);
      setInvitations(nextInvitations);
      setAssignments(nextAssignments);
      setCommitments(nextCommitments);
      setActivities(nextActivities.slice(0, 40));
      setNotifications(nextNotifications.filter((item) => !item.readAt).slice(0, 8));
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadSpaces(); }, [user]);
  useEffect(() => { if (spaceId) void loadSpaceData(spaceId); }, [spaceId]);

  const activeMembers = members.filter((item) => (item.status || 'active') === 'active');
  const pendingAssignments = assignments.filter((item) => item.status === 'unpaid' || item.status === 'submitted');
  const unreadForSpace = notifications.filter((item) => item.spaceId === spaceId);

  if (!loading && spaces.length === 0) {
    return <main className="page"><PageHeader eyebrow="Collaboration" title="Sharing" description="Invite people into Household, Trip, SME, Goal, and Custom Spaces." />
      <div className="info-banner"><strong>No shared Space yet</strong><span>Create a non-personal Space first, then invite members and share bills.</span></div>
      <Link className="button primary" to="/spaces">Create a Space</Link>
    </main>;
  }

  return <main className="page collaboration-page">
    <PageHeader eyebrow="v0.7 collaboration" title="Sharing & members" description="Manage roles, approvals, shared bills, proof of payment, WhatsApp notices, and activity history." action={canManage ? <button className="button primary" onClick={() => setInviteOpen(true)}>Invite member</button> : undefined} />
    {error && <div className="notice error">{error}</div>}
    <section className="collaboration-space-bar">
      <label>Shared Space<select value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>{spaces.map((space) => <option value={space.id} key={space.id}>{space.name} — {space.type}</option>)}</select></label>
      {selectedSpace && <div className="collaboration-space-summary"><strong>{selectedSpace.name}</strong><span>{roleLabel[currentMember?.role || 'viewer']} · {selectedSpace.collaborationMode.replace('_', ' ')}</span></div>}
      {unreadForSpace.length > 0 && <button className="notification-pill" onClick={async () => { await Promise.all(unreadForSpace.map((item) => markNotificationRead(item.id))); setNotifications((items) => items.filter((item) => item.spaceId !== spaceId)); }}>{unreadForSpace.length} new</button>}
    </section>

    {selectedSpace && canManage && <CollaborationSettings space={selectedSpace} onSaved={async () => { await loadSpaces(); await loadSpaceData(spaceId); }} />}

    <section className="summary-grid collaboration-summary">
      <article className="summary-card featured"><span>Active members</span><strong>{activeMembers.length}</strong><small>Including the Space owner</small></article>
      <article className="summary-card"><span>Pending invitations</span><strong>{invitations.filter((item) => item.status === 'pending').length}</strong><small>Awaiting acceptance</small></article>
      <article className="summary-card"><span>Shared bills</span><strong>{pendingAssignments.length}</strong><small>Unpaid or submitted</small></article>
      <article className="summary-card"><span>Approval</span><strong>{selectedSpace?.approvalMode === 'owner_approval' ? 'Required' : 'Automatic'}</strong><small>For member payment claims</small></article>
    </section>

    <div className="segmented-control planning-filter collaboration-tabs"><button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Members</button><button className={tab === 'bills' ? 'active' : ''} onClick={() => setTab('bills')}>Shared bills</button><button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Activity</button></div>

    {loading ? <div className="loading-panel">Loading collaboration data…</div> : tab === 'members' ? <>
      <section className="panel collaboration-panel"><div className="panel-heading"><div><span className="eyebrow">Access</span><h2>Members</h2></div></div>
        <div className="member-list">{members.map((member) => <article className={`member-row status-${member.status || 'active'}`} key={member.id}><span className="avatar">{(member.displayName || member.email || 'M').charAt(0).toUpperCase()}</span><div><strong>{member.displayName || member.email || member.uid}</strong><small>{member.email || member.uid}</small></div><span className="type-badge">{roleLabel[member.role] || member.role}</span><div className="permission-chips"><span>{member.canUseAccounts ? 'Use accounts' : 'No account use'}</span><span>{member.canViewBalances ? 'See balances' : 'Balances hidden'}</span><span>{member.canViewLedger ? 'See ledger' : 'Ledger hidden'}</span></div>{canManage && member.role !== 'owner' && <div className="button-row"><button className="text-button" onClick={() => setEditingMember(member)}>Manage</button><button className="text-button danger" onClick={async () => { if (confirm(`Remove ${member.displayName || member.email || 'this member'}? Their financial history will remain.`)) { await removeSpaceMember(spaceId, member.uid); await loadSpaceData(spaceId); } }}>Remove</button></div>}</article>)}</div>
      </section>
      {canManage && <section className="panel collaboration-panel"><div className="panel-heading"><div><span className="eyebrow">Invitations</span><h2>Pending and recent invitations</h2></div></div><div className="invitation-list">{invitations.length === 0 ? <p>No invitations yet.</p> : invitations.map((invitation) => <article key={invitation.id} className="invitation-row"><div><strong>{invitation.email}</strong><small>{roleLabel[invitation.role]} · {invitation.status}</small></div>{invitation.status === 'pending' && <><button className="button secondary" onClick={() => void navigator.clipboard.writeText(inviteUrl(invitation.token))}>Copy invite link</button><a className="button secondary" href={`https://wa.me/?text=${encodeURIComponent(`Join ${selectedSpace?.name || 'my BajetBN Space'}: ${inviteUrl(invitation.token)}`)}`} target="_blank" rel="noreferrer">WhatsApp</a><button className="text-button danger" onClick={async () => { await revokeSpaceInvitation(invitation.id); await loadSpaceData(spaceId); }}>Revoke</button></>}</article>)}</div></section>}
    </> : tab === 'bills' ? <section className="panel collaboration-panel"><div className="panel-heading"><div><span className="eyebrow">Coordination</span><h2>Shared bills and payment claims</h2></div>{canAssign && <button className="button primary" onClick={() => setAssignmentOpen(true)}>Assign bill</button>}</div>
      <div className="shared-bill-grid">{assignments.length === 0 ? <p>No bills assigned to members yet.</p> : assignments.map((assignment) => {
        const isMine = assignment.memberUid === user?.uid;
        const canReview = canManage && assignment.status === 'submitted';
        const whatsapp = selectedSpace?.headWhatsapp ? whatsappHref(selectedSpace.headWhatsapp, `Hi, I have ${assignment.status === 'confirmed' ? 'paid' : 'submitted payment for'} ${assignment.commitmentName} (${formatMoney(assignment.assignedMinor, assignment.currency)}), due ${assignment.dueDate}. Please check BajetBN.`) : '';
        return <article className={`shared-bill-card status-${assignment.status}`} key={assignment.id}><div className="planning-card-head"><div><span className="eyebrow">{assignment.status}</span><h3>{assignment.commitmentName}</h3></div><strong>{formatMoney(assignment.assignedMinor, assignment.currency)}</strong></div><div className="planning-meta"><span>{assignment.memberName || assignment.memberEmail || assignment.memberUid}</span><span>Due {assignment.dueDate}</span></div>{assignment.note && <p>{assignment.note}</p>}<div className="button-row">{isMine && (assignment.status === 'unpaid' || assignment.status === 'rejected') && <button className="button primary" onClick={() => setSubmitting(assignment)}>Mark paid</button>}{assignment.proofPath && <button className="button secondary" onClick={async () => window.open(await getSharedBillProofUrl(assignment.proofPath!), '_blank', 'noopener,noreferrer')}>View proof</button>}{whatsapp && isMine && (assignment.status === 'submitted' || assignment.status === 'confirmed') && <a className="button secondary" href={whatsapp} target="_blank" rel="noreferrer">Notify head on WhatsApp</a>}{canReview && <><button className="button primary" onClick={async () => { await reviewSharedBillPayment({ assignmentId: assignment.id, decision: 'confirmed' }); await loadSpaceData(spaceId); }}>Confirm</button><button className="button danger-outline" onClick={async () => { await reviewSharedBillPayment({ assignmentId: assignment.id, decision: 'rejected' }); await loadSpaceData(spaceId); }}>Reject</button></>}</div></article>;
      })}</div>
    </section> : <section className="panel collaboration-panel"><div className="panel-heading"><div><span className="eyebrow">Audit trail</span><h2>Recent Space activity</h2></div></div><div className="activity-list">{activities.length === 0 ? <p>No activity recorded yet.</p> : activities.map((activity) => <article key={activity.id}><span className="activity-dot"/><div><strong>{activity.summary}</strong><small>{activity.actorName || activity.actorUid} · {activity.createdAt?.toDate?.().toLocaleString() || 'recently'}</small></div></article>)}</div></section>}

    {inviteOpen && selectedSpace && <Modal title={`Invite to ${selectedSpace.name}`} onClose={() => setInviteOpen(false)}><InviteForm spaceId={selectedSpace.id} onSaved={async () => { setInviteOpen(false); await loadSpaceData(spaceId); }} /></Modal>}
    {editingMember && <Modal title="Manage member access" onClose={() => setEditingMember(null)}><MemberForm member={editingMember} onSaved={async () => { setEditingMember(null); await loadSpaceData(spaceId); }} /></Modal>}
    {assignmentOpen && selectedSpace && <Modal title="Assign a shared bill" onClose={() => setAssignmentOpen(false)}><AssignmentForm space={selectedSpace} members={activeMembers.filter((item) => item.role !== 'owner')} commitments={commitments} onSaved={async () => { setAssignmentOpen(false); await loadSpaceData(spaceId); }} /></Modal>}
    {submitting && <Modal title={`Mark ${submitting.commitmentName} paid`} onClose={() => setSubmitting(null)}><SubmitPaymentForm assignment={submitting} onSaved={async () => { setSubmitting(null); await loadSpaceData(spaceId); }} /></Modal>}
  </main>;
}

function CollaborationSettings({ space, onSaved }: { space: Space; onSaved: () => Promise<void> }) {
  const [approvalMode, setApprovalMode] = useState(space.approvalMode || 'none');
  const [headWhatsapp, setHeadWhatsapp] = useState(space.headWhatsapp || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { setApprovalMode(space.approvalMode || 'none'); setHeadWhatsapp(space.headWhatsapp || ''); }, [space.id, space.approvalMode, space.headWhatsapp]);
  const save = async () => { setBusy(true); setError(''); try { await updateSpaceCollaborationSettings({ spaceId: space.id, approvalMode, headWhatsapp }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <section className="collaboration-settings"><div><strong>Payment claim approval</strong><span>{approvalMode === 'owner_approval' ? 'The Space head reviews each member claim.' : 'Member claims are confirmed automatically.'}</span></div><select value={approvalMode} onChange={(event) => setApprovalMode(event.target.value as 'none' | 'owner_approval')}><option value="none">Automatic confirmation</option><option value="owner_approval">Owner/Admin approval</option></select><label>Head WhatsApp<input value={headWhatsapp} onChange={(event) => setHeadWhatsapp(event.target.value)} placeholder="6738XXXXXX"/><small>Used only to prepare a WhatsApp message. BajetBN does not send it automatically.</small></label><button className="button secondary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save sharing settings'}</button>{error && <div className="notice error">{error}</div>}</section>;
}

function InviteForm({ spaceId, onSaved }: { spaceId: string; onSaved: () => Promise<void> }) {
  const [email, setEmail] = useState(''); const [role, setRole] = useState<Exclude<SpaceRole, 'owner' | 'member'>>('contributor');
  const [canUseAccounts, setCanUseAccounts] = useState(false); const [canViewBalances, setCanViewBalances] = useState(false); const [canViewLedger, setCanViewLedger] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await createSpaceInvitation({ spaceId, email, role, canUseAccounts, canViewBalances, canViewLedger }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value as Exclude<SpaceRole, 'owner' | 'member'>)}>{editableRoles.map((item) => <option value={item} key={item}>{roleLabel[item]}</option>)}</select></label><div className="permission-editor"><label><input type="checkbox" checked={canUseAccounts} onChange={(event) => setCanUseAccounts(event.target.checked)}/> Can use shared Accounts</label><label><input type="checkbox" checked={canViewBalances} onChange={(event) => setCanViewBalances(event.target.checked)}/> Can view Account balances</label><label><input type="checkbox" checked={canViewLedger} onChange={(event) => setCanViewLedger(event.target.checked)}/> Can view Account ledger</label></div><button className="button primary full" disabled={busy}>{busy ? 'Creating invitation…' : 'Create invitation'}</button></form>;
}

function MemberForm({ member, onSaved }: { member: SpaceMember; onSaved: () => Promise<void> }) {
  const [role, setRole] = useState<Exclude<SpaceRole, 'owner' | 'member'>>(member.role === 'member' ? 'contributor' : member.role as Exclude<SpaceRole, 'owner' | 'member'>);
  const [status, setStatus] = useState<'active' | 'suspended'>((member.status === 'suspended' ? 'suspended' : 'active'));
  const [canUseAccounts, setCanUseAccounts] = useState(member.canUseAccounts); const [canViewBalances, setCanViewBalances] = useState(member.canViewBalances); const [canViewLedger, setCanViewLedger] = useState(member.canViewLedger);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await updateSpaceMember({ spaceId: member.spaceId, memberUid: member.uid, role, status, canUseAccounts, canViewBalances, canViewLedger }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Role<select value={role} onChange={(event) => setRole(event.target.value as Exclude<SpaceRole, 'owner' | 'member'>)}>{editableRoles.map((item) => <option value={item} key={item}>{roleLabel[item]}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as 'active' | 'suspended')}><option value="active">Active</option><option value="suspended">Suspended</option></select></label><div className="permission-editor"><label><input type="checkbox" checked={canUseAccounts} onChange={(event) => setCanUseAccounts(event.target.checked)}/> Can use shared Accounts</label><label><input type="checkbox" checked={canViewBalances} onChange={(event) => setCanViewBalances(event.target.checked)}/> Can view balances</label><label><input type="checkbox" checked={canViewLedger} onChange={(event) => setCanViewLedger(event.target.checked)}/> Can view ledger</label></div><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Save member access'}</button></form>;
}

function AssignmentForm({ space, members, commitments, onSaved }: { space: Space; members: SpaceMember[]; commitments: Commitment[]; onSaved: () => Promise<void> }) {
  const [commitmentId, setCommitmentId] = useState(commitments[0]?.id || ''); const [memberUid, setMemberUid] = useState(members[0]?.uid || ''); const [amount, setAmount] = useState(commitments[0] ? String(commitments[0].amountMinor / 100) : ''); const [dueDate, setDueDate] = useState(commitments[0]?.nextDueDate || today()); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const selected = commitments.find((item) => item.id === commitmentId);
  useEffect(() => { if (selected) { setAmount(String(selected.amountMinor / 100)); setDueDate(selected.nextDueDate || selected.startDate); } }, [commitmentId]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await createSharedBillAssignment({ spaceId: space.id, commitmentId, memberUid, assignedMinor: toMinorUnits(amount), dueDate, note }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}{commitments.length === 0 || members.length === 0 ? <div className="notice">Create an active bill and invite at least one member before assigning a bill.</div> : <><label>Bill or instalment<select value={commitmentId} onChange={(event) => setCommitmentId(event.target.value)}>{commitments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Assigned member<select value={memberUid} onChange={(event) => setMemberUid(event.target.value)}>{members.map((item) => <option value={item.uid} key={item.uid}>{item.displayName || item.email || item.uid}</option>)}</select></label><label>Member share (BND)<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required/></label><label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required/></label><label>Note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="button primary full" disabled={busy}>{busy ? 'Assigning…' : 'Assign bill'}</button></>}</form>;
}

function SubmitPaymentForm({ assignment, onSaved }: { assignment: SharedBillAssignment; onSaved: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { const proof = file ? await uploadSharedBillProof({ spaceId: assignment.spaceId, assignmentId: assignment.id, file }) : {}; await submitSharedBillPayment({ assignmentId: assignment.id, ...proof, note }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<div className="transaction-preview"><div><span>Assigned amount</span><strong>{formatMoney(assignment.assignedMinor, assignment.currency)}</strong></div><div><span>Due date</span><strong>{assignment.dueDate}</strong></div><small>This records a payment claim for the Space head. It does not automatically post an Account transaction.</small></div><label>Proof of payment<input type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)}/><small>Optional unless your group requires it. Images and PDFs up to 10 MB.</small></label><label>Note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Transfer reference or short message"/></label><button className="button primary full" disabled={busy}>{busy ? 'Submitting…' : 'Mark paid'}</button></form>;
}
