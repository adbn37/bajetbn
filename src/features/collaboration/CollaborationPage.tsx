import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { listAccounts } from '../../repositories/accountRepository';
import {
  createSharedBillAssignment,
  createSpaceInvitation,
  getSharedBillProofUrl,
  listSharedBillAssignments,
  listSharedBillPayments,
  listSpaceActivities,
  listSpaceCommitments,
  listSpaceInvitations,
  listSpaceMembers,
  listUserNotifications,
  markNotificationRead,
  removeSpaceMember,
  reviewSharedBillPayment,
  reverseSharedBillPayment,
  revokeSpaceInvitation,
  submitSharedBillPayment,
  updateSpaceCollaborationSettings,
  updateSpaceMember,
  uploadSharedBillProof,
} from '../../repositories/collaborationRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type {
  Account,
  Commitment,
  SharedBillAssignment,
  SharedBillPayment,
  SharedBillSettlementMode,
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
const roleLabel: Record<string, string> = { owner: 'Owner', admin: 'Manager', contributor: 'Can add', payer: 'Can pay', viewer: 'View only', member: 'Member' };
const statusLabel: Record<string, string> = {
  unpaid: 'Not paid',
  submitted: 'Waiting for check',
  partially_paid: 'Paid part of it',
  paid: 'Paid',
  rejected: 'Not accepted',
  confirmed: 'Old payment needs finishing',
};

function today() { return new Date().toISOString().slice(0, 10); }
function inviteUrl(token: string) { return `${window.location.origin}/join?token=${encodeURIComponent(token)}`; }
function whatsappHref(number: string, message: string) {
  const digits = number.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : '';
}
function settledAmount(assignment: SharedBillAssignment) { return assignment.settledMinor || 0; }
function outstandingAmount(assignment: SharedBillAssignment) {
  return assignment.outstandingMinor ?? Math.max(0, assignment.assignedMinor - settledAmount(assignment));
}

export function CollaborationPage() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState('');
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [assignments, setAssignments] = useState<SharedBillAssignment[]>([]);
  const [payments, setPayments] = useState<SharedBillPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
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
  const activeMembers = members.filter((item) => (item.status || 'active') === 'active');
  const unreadForSpace = notifications.filter((item) => item.spaceId === spaceId);
  const pendingAssignments = assignments.filter((item) => item.status !== 'paid');
  const paymentMap = useMemo(() => new Map(payments.map((item) => [item.id, item])), [payments]);

  const loadSpaces = async () => {
    if (!user) return;
    const next = (await listSpaces(user.uid)).filter((item) => !item.archivedAt && item.type !== 'personal');
    setSpaces(next);
    setSpaceId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id || '');
  };

  const loadSpaceData = async (selectedId: string) => {
    if (!user || !selectedId) return;
    setLoading(true);
    setError('');
    try {
      const nextMembers = await listSpaceMembers(selectedId);
      const signedInMember = nextMembers.find((member) => member.uid === user.uid);
      const mayManageInvitations = signedInMember?.role === 'owner' || signedInMember?.role === 'admin';
      const [nextInvitations, nextAssignments, nextPayments, nextCommitments, nextActivities, nextNotifications, nextAccounts] = await Promise.all([
        mayManageInvitations ? listSpaceInvitations(selectedId) : Promise.resolve([] as SpaceInvitation[]),
        listSharedBillAssignments(selectedId),
        listSharedBillPayments(selectedId),
        listSpaceCommitments(selectedId),
        listSpaceActivities(selectedId),
        listUserNotifications(user.uid),
        listAccounts(user.uid),
      ]);
      setMembers(nextMembers);
      setInvitations(nextInvitations);
      setAssignments(nextAssignments);
      setPayments(nextPayments);
      setCommitments(nextCommitments);
      setActivities(nextActivities.slice(0, 40));
      setNotifications(nextNotifications.filter((item) => !item.readAt).slice(0, 8));
      setAccounts(nextAccounts);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSpaces(); }, [user]);
  useEffect(() => { if (spaceId) void loadSpaceData(spaceId); }, [spaceId]);

  const runAction = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
      await loadSpaceData(spaceId);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  };

  if (!loading && spaces.length === 0) {
    return <main className="page">
      <PageHeader eyebrow="Share with others" title="Sharing" description="Invite family, friends, or team members to a shared Space." />
      <div className="info-banner"><strong>No shared Space yet</strong><span>Create a non-personal Space first, then invite members and share bills.</span></div>
      <Link className="button primary" to="/spaces">Create a Space</Link>
    </main>;
  }

  return <main className="page collaboration-page">
    <PageHeader
      eyebrow="Shared money"
      title="Sharing"
      description="Manage members, split bills, check payments, view proof, and send WhatsApp notices."
      action={canManage ? <button className="button primary" onClick={() => setInviteOpen(true)}>Invite member</button> : undefined}
    />
    {error && <div className="notice error">{error}</div>}

    <section className="collaboration-space-bar">
      <label>Choose a shared Space<select value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>{spaces.map((space) => <option value={space.id} key={space.id}>{space.name} — {space.type}</option>)}</select></label>
      {selectedSpace && <div className="collaboration-space-summary"><strong>{selectedSpace.name}</strong><span>{roleLabel[currentMember?.role || 'viewer']} · {selectedSpace.collaborationMode === 'private' ? 'Private' : 'Shared'}</span></div>}
      {unreadForSpace.length > 0 && <button className="notification-pill" onClick={() => void runAction(async () => {
        await Promise.all(unreadForSpace.map((item) => markNotificationRead(item.id)));
      })}>{unreadForSpace.length} new</button>}
    </section>

    {selectedSpace && canManage && <CollaborationSettings space={selectedSpace} onSaved={async () => { await loadSpaces(); await loadSpaceData(spaceId); }} />}

    <section className="summary-grid collaboration-summary">
      <article className="summary-card featured"><span>Active members</span><strong>{activeMembers.length}</strong><small>Including the Space owner</small></article>
      <article className="summary-card"><span>Invites not accepted</span><strong>{invitations.filter((item) => item.status === 'pending').length}</strong><small>Waiting for the person to join</small></article>
      <article className="summary-card"><span>Bills still open</span><strong>{pendingAssignments.length}</strong><small>Not paid, partly paid, or waiting for a check</small></article>
      <article className="summary-card"><span>Payment check</span><strong>{selectedSpace?.approvalMode === 'owner_approval' ? 'Owner checks' : 'Automatic'}</strong><small>How member payments are checked</small></article>
    </section>

    <div className="segmented-control planning-filter collaboration-tabs">
      <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Members</button>
      <button className={tab === 'bills' ? 'active' : ''} onClick={() => setTab('bills')}>Shared bills</button>
      <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Activity</button>
    </div>

    {loading ? <div className="loading-panel">Loading sharing information…</div> : tab === 'members' ? <>
      <section className="panel collaboration-panel">
        <div className="panel-heading"><div><span className="eyebrow">Access</span><h2>Members</h2></div></div>
        <div className="member-list">{members.map((member) => <article className={`member-row status-${member.status || 'active'}`} key={member.id}>
          <span className="avatar">{(member.displayName || member.email || 'M').charAt(0).toUpperCase()}</span>
          <div><strong>{member.displayName || member.email || member.uid}</strong><small>{member.email || member.uid}</small></div>
          <span className="type-badge">{roleLabel[member.role] || member.role}</span>
          <div className="permission-chips"><span>{member.canUseAccounts ? 'Use accounts' : 'No account use'}</span><span>{member.canViewBalances ? 'See balances' : 'Balances hidden'}</span><span>{member.canViewLedger ? 'See account activity' : 'Account activity hidden'}</span></div>
          {canManage && member.role !== 'owner' && <div className="button-row"><button className="text-button" onClick={() => setEditingMember(member)}>Manage</button><button className="text-button danger" onClick={() => void runAction(async () => {
            if (confirm(`Remove ${member.displayName || member.email || 'this member'}? Their past money records will stay.`)) await removeSpaceMember(spaceId, member.uid);
          })}>Remove</button></div>}
        </article>)}</div>
      </section>
      {canManage && <section className="panel collaboration-panel">
        <div className="panel-heading"><div><span className="eyebrow">Invitations</span><h2>Invitations</h2></div></div>
        <div className="invitation-list">{invitations.length === 0 ? <p>No invitations yet.</p> : invitations.map((invitation) => <article key={invitation.id} className="invitation-row">
          <div><strong>{invitation.email}</strong><small>{roleLabel[invitation.role]} · {invitation.status}</small></div>
          {invitation.status === 'pending' && <><button className="button secondary" onClick={() => void navigator.clipboard.writeText(inviteUrl(invitation.token))}>Copy invite link</button><a className="button secondary" href={`https://wa.me/?text=${encodeURIComponent(`Join ${selectedSpace?.name || 'my BajetBN Space'}: ${inviteUrl(invitation.token)}`)}`} target="_blank" rel="noreferrer">WhatsApp</a><button className="text-button danger" onClick={() => void runAction(() => revokeSpaceInvitation(invitation.id))}>Cancel invite</button></>}
        </article>)}</div>
      </section>}
    </> : tab === 'bills' ? <section className="panel collaboration-panel">
      <div className="panel-heading"><div><span className="eyebrow">Payments</span><h2>Shared bills</h2></div>{canManage && <button className="button primary" onClick={() => setAssignmentOpen(true)}>Give bill share</button>}</div>
      <div className="info-banner"><strong>Choose how you paid</strong><span>Use a BajetBN account to update its balance, or choose another method to mark the bill paid without changing an account.</span></div>
      <div className="shared-bill-grid">{assignments.length === 0 ? <p>No bill shares yet.</p> : assignments.map((assignment) => {
        const isMine = assignment.memberUid === user?.uid;
        const outstanding = outstandingAmount(assignment);
        const settled = settledAmount(assignment);
        const currentPayment = assignment.currentPaymentId ? paymentMap.get(assignment.currentPaymentId) : undefined;
        const lastPayment = assignment.lastPaymentId ? paymentMap.get(assignment.lastPaymentId) : undefined;
        const proofPath = currentPayment?.proofPath || lastPayment?.proofPath || assignment.proofPath;
        const canReview = canManage && currentPayment?.status === 'submitted';
        const canReverse = Boolean(lastPayment?.status === 'posted' && (canManage || isMine));
        const maySubmit = isMine && outstanding > 0 && !assignment.currentPaymentId && ['unpaid', 'partially_paid', 'rejected', 'confirmed'].includes(assignment.status);
        const whatsapp = selectedSpace?.headWhatsapp ? whatsappHref(selectedSpace.headWhatsapp, `Hi, I have recorded ${lastPayment ? formatMoney(lastPayment.amountMinor, lastPayment.currency) : formatMoney(assignment.assignedMinor, assignment.currency)} for ${assignment.commitmentName}. BajetBN status: ${statusLabel[assignment.status] || assignment.status}.`) : '';
        return <article className={`shared-bill-card status-${assignment.status}`} key={assignment.id}>
          <div className="planning-card-head"><div><span className="eyebrow">{statusLabel[assignment.status] || assignment.status}</span><h3>{assignment.commitmentName}</h3></div><strong>{formatMoney(assignment.assignedMinor, assignment.currency)}</strong></div>
          <div className="planning-meta"><span>{assignment.memberName || assignment.memberEmail || assignment.memberUid}</span><span>Due {assignment.dueDate}</span></div>
          <div className="transaction-preview"><div><span>Paid</span><strong>{formatMoney(settled, assignment.currency)}</strong></div><div><span>Left to pay</span><strong>{formatMoney(outstanding, assignment.currency)}</strong></div>{currentPayment && <small>Payment {currentPayment.displayId}: {formatMoney(currentPayment.amountMinor, currentPayment.currency)} · {currentPayment.settlementMode === 'account' ? 'My BajetBN account' : 'Another method'}</small>}{lastPayment && !currentPayment && <small>Last payment {lastPayment.displayId}: {lastPayment.settlementMode === 'account' ? 'Account updated' : 'Paid another way'}.</small>}</div>
          {assignment.note && <p>{assignment.note}</p>}
          <div className="button-row">
            {maySubmit && <button className="button primary" onClick={() => setSubmitting(assignment)}>{assignment.status === 'confirmed' ? 'Finish old payment' : 'Add payment'}</button>}
            {proofPath && <button className="button secondary" onClick={() => void getSharedBillProofUrl(proofPath).then((url) => window.open(url, '_blank', 'noopener,noreferrer'))}>View proof</button>}
            {whatsapp && isMine && (assignment.status === 'submitted' || assignment.status === 'partially_paid' || assignment.status === 'paid') && <a className="button secondary" href={whatsapp} target="_blank" rel="noreferrer">Tell group head on WhatsApp</a>}
            {canReview && currentPayment && <><button className="button primary" onClick={() => void runAction(() => reviewSharedBillPayment({ paymentId: currentPayment.id, decision: 'confirmed' }))}>Confirm payment</button><button className="button danger-outline" onClick={() => void runAction(() => reviewSharedBillPayment({ paymentId: currentPayment.id, decision: 'rejected' }))}>Decline</button></>}
            {canReverse && lastPayment && <button className="button danger-outline" onClick={() => void runAction(async () => {
              if (confirm(`Undo ${lastPayment.displayId}? The account balance will be restored and the bill will open again.`)) await reverseSharedBillPayment({ paymentId: lastPayment.id, reversalDate: today(), reason: 'Undone from Sharing' });
            })}>Undo payment</button>}
          </div>
        </article>;
      })}</div>
    </section> : <section className="panel collaboration-panel">
      <div className="panel-heading"><div><span className="eyebrow">History</span><h2>Recent activity</h2></div></div>
      <div className="activity-list">{activities.length === 0 ? <p>No activity recorded yet.</p> : activities.map((activity) => <article key={activity.id}><span className="activity-dot"/><div><strong>{activity.summary}</strong><small>{activity.actorName || activity.actorUid} · {activity.createdAt?.toDate?.().toLocaleString() || 'recently'}</small></div></article>)}</div>
    </section>}

    {inviteOpen && selectedSpace && <Modal title={`Invite to ${selectedSpace.name}`} onClose={() => setInviteOpen(false)}><InviteForm spaceId={selectedSpace.id} onSaved={async () => { setInviteOpen(false); await loadSpaceData(spaceId); }} /></Modal>}
    {editingMember && <Modal title="Change member access" onClose={() => setEditingMember(null)}><MemberForm member={editingMember} onSaved={async () => { setEditingMember(null); await loadSpaceData(spaceId); }} /></Modal>}
    {assignmentOpen && selectedSpace && <Modal title="Give a bill share" onClose={() => setAssignmentOpen(false)}><AssignmentForm space={selectedSpace} members={activeMembers.filter((item) => item.role !== 'owner')} commitments={commitments} onSaved={async () => { setAssignmentOpen(false); await loadSpaceData(spaceId); }} /></Modal>}
    {submitting && <Modal title={`Add payment for ${submitting.commitmentName}`} onClose={() => setSubmitting(null)}><SubmitPaymentForm assignment={submitting} accounts={accounts.filter((account) => account.currency === submitting.currency)} onSaved={async () => { setSubmitting(null); await loadSpaceData(spaceId); }} /></Modal>}
  </main>;
}

function CollaborationSettings({ space, onSaved }: { space: Space; onSaved: () => Promise<void> }) {
  const [approvalMode, setApprovalMode] = useState(space.approvalMode || 'none');
  const [headWhatsapp, setHeadWhatsapp] = useState(space.headWhatsapp || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setApprovalMode(space.approvalMode || 'none'); setHeadWhatsapp(space.headWhatsapp || ''); }, [space.id, space.approvalMode, space.headWhatsapp]);
  const save = async () => { setBusy(true); setError(''); try { await updateSpaceCollaborationSettings({ spaceId: space.id, approvalMode, headWhatsapp }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <section className="collaboration-settings"><div><strong>Check member payments</strong><span>{approvalMode === 'owner_approval' ? 'The Space owner or admin checks each payment before it is accepted.' : 'Member payments are accepted automatically.'}</span></div><select value={approvalMode} onChange={(event) => setApprovalMode(event.target.value as 'none' | 'owner_approval')}><option value="none">Accept automatically</option><option value="owner_approval">Owner or admin checks first</option></select><label>Head WhatsApp<input value={headWhatsapp} onChange={(event) => setHeadWhatsapp(event.target.value)} placeholder="6738XXXXXX"/><small>Used only to prepare a WhatsApp message. BajetBN does not send it automatically.</small></label><button className="button secondary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save sharing settings'}</button>{error && <div className="notice error">{error}</div>}</section>;
}

function InviteForm({ spaceId, onSaved }: { spaceId: string; onSaved: () => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<SpaceRole, 'owner' | 'member'>>('contributor');
  const [canUseAccounts, setCanUseAccounts] = useState(false);
  const [canViewBalances, setCanViewBalances] = useState(false);
  const [canViewLedger, setCanViewLedger] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await createSpaceInvitation({ spaceId, email, role, canUseAccounts, canViewBalances, canViewLedger }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Access level<select value={role} onChange={(event) => setRole(event.target.value as Exclude<SpaceRole, 'owner' | 'member'>)}>{editableRoles.map((item) => <option value={item} key={item}>{roleLabel[item]}</option>)}</select></label><div className="permission-editor"><label><input type="checkbox" checked={canUseAccounts} onChange={(event) => setCanUseAccounts(event.target.checked)}/> Can use shared Accounts</label><label><input type="checkbox" checked={canViewBalances} onChange={(event) => setCanViewBalances(event.target.checked)}/> Can view Account balances</label><label><input type="checkbox" checked={canViewLedger} onChange={(event) => setCanViewLedger(event.target.checked)}/> Can see Account activity</label></div><button className="button primary full" disabled={busy}>{busy ? 'Creating invite…' : 'Create invite'}</button></form>;
}

function MemberForm({ member, onSaved }: { member: SpaceMember; onSaved: () => Promise<void> }) {
  const [role, setRole] = useState<Exclude<SpaceRole, 'owner' | 'member'>>(member.role === 'member' ? 'contributor' : member.role as Exclude<SpaceRole, 'owner' | 'member'>);
  const [status, setStatus] = useState<'active' | 'suspended'>(member.status === 'suspended' ? 'suspended' : 'active');
  const [canUseAccounts, setCanUseAccounts] = useState(member.canUseAccounts);
  const [canViewBalances, setCanViewBalances] = useState(member.canViewBalances);
  const [canViewLedger, setCanViewLedger] = useState(member.canViewLedger);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await updateSpaceMember({ spaceId: member.spaceId, memberUid: member.uid, role, status, canUseAccounts, canViewBalances, canViewLedger }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Access level<select value={role} onChange={(event) => setRole(event.target.value as Exclude<SpaceRole, 'owner' | 'member'>)}>{editableRoles.map((item) => <option value={item} key={item}>{roleLabel[item]}</option>)}</select></label><label>Member status<select value={status} onChange={(event) => setStatus(event.target.value as 'active' | 'suspended')}><option value="active">Active</option><option value="suspended">Paused</option></select></label><div className="permission-editor"><label><input type="checkbox" checked={canUseAccounts} onChange={(event) => setCanUseAccounts(event.target.checked)}/> Can use shared Accounts</label><label><input type="checkbox" checked={canViewBalances} onChange={(event) => setCanViewBalances(event.target.checked)}/> Can view balances</label><label><input type="checkbox" checked={canViewLedger} onChange={(event) => setCanViewLedger(event.target.checked)}/> Can see account activity</label></div><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Save access'}</button></form>;
}

function AssignmentForm({ space, members, commitments, onSaved }: { space: Space; members: SpaceMember[]; commitments: Commitment[]; onSaved: () => Promise<void> }) {
  const [commitmentId, setCommitmentId] = useState(commitments[0]?.id || '');
  const [memberUid, setMemberUid] = useState(members[0]?.uid || '');
  const [amount, setAmount] = useState(commitments[0] ? String(commitments[0].amountMinor / 100) : '');
  const [dueDate, setDueDate] = useState(commitments[0]?.nextDueDate || today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = commitments.find((item) => item.id === commitmentId);
  useEffect(() => { if (selected) { setAmount(String(selected.amountMinor / 100)); setDueDate(selected.nextDueDate || selected.startDate); } }, [commitmentId]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await createSharedBillAssignment({ spaceId: space.id, commitmentId, memberUid, assignedMinor: toMinorUnits(amount), dueDate, note }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}{commitments.length === 0 || members.length === 0 ? <div className="notice">Add a bill and invite at least one person before sharing the bill.</div> : <><label>Bill or instalment<select value={commitmentId} onChange={(event) => setCommitmentId(event.target.value)}>{commitments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Who will pay<select value={memberUid} onChange={(event) => setMemberUid(event.target.value)}>{members.map((item) => <option value={item.uid} key={item.uid}>{item.displayName || item.email || item.uid}</option>)}</select></label><label>Their share (BND)<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required/><small>The total shared amount cannot be more than the bill amount due now.</small></label><label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required readOnly/></label><label>Note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Give bill share'}</button></>}</form>;
}

function SubmitPaymentForm({ assignment, accounts, onSaved }: { assignment: SharedBillAssignment; accounts: Account[]; onSaved: () => Promise<void> }) {
  const outstanding = outstandingAmount(assignment);
  const [amount, setAmount] = useState(String(outstanding / 100));
  const [settlementMode, setSettlementMode] = useState<SharedBillSettlementMode>(accounts.length ? 'account' : 'external');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [paymentDate, setPaymentDate] = useState(today());
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const amountMinor = toMinorUnits(amount);
      if (amountMinor <= 0) throw new Error('Enter an amount greater than BND 0.00.');
      if (amountMinor > outstanding) throw new Error('The amount paid cannot be more than the amount left to pay.');
      if (settlementMode === 'account' && !accountId) throw new Error('Choose the account used for this payment.');
      const proof = file ? await uploadSharedBillProof({ spaceId: assignment.spaceId, assignmentId: assignment.id, file }) : {};
      await submitSharedBillPayment({ assignmentId: assignment.id, amountMinor, settlementMode, accountId: settlementMode === 'account' ? accountId : undefined, paymentDate, ...proof, note });
      await onSaved();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };
  return <form className="form-stack" onSubmit={submit}>
    {error && <div className="notice error">{error}</div>}
    <div className="transaction-preview"><div><span>Amount to pay</span><strong>{formatMoney(assignment.assignedMinor, assignment.currency)}</strong></div><div><span>Amount left before payment</span><strong>{formatMoney(outstanding, assignment.currency)}</strong></div><small>You can pay part of it. Any amount left will stay open.</small></div>
    <label>Amount paid now (BND)<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required/><small>Enter the amount you paid now.</small></label>
    <label>How did you pay?<select value={settlementMode} onChange={(event) => setSettlementMode(event.target.value as SharedBillSettlementMode)}><option value="account" disabled={accounts.length === 0}>Paid from my BajetBN account</option><option value="external">Paid using another method</option></select></label>
    {settlementMode === 'account' ? <><label>Account used<select value={accountId} onChange={(event) => setAccountId(event.target.value)} required>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name} — {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label><div className="notice">After the payment is confirmed, BajetBN records the expense and updates this account once.</div></> : <div className="notice">This marks the shared bill as paid without changing any BajetBN account balance.</div>}
    <label>Payment date<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required/></label>
    <label>Proof of payment<input type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)}/><small>Optional unless your group requires it. Images and PDFs up to 10 MB.</small></label>
    <label>Note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Receipt number or short message"/></label>
    <button className="button primary full" disabled={busy}>{busy ? 'Sending…' : 'Send payment details'}</button>
  </form>;
}
