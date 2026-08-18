import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { PaymentMethodField } from '../../components/PaymentMethodField';
import { paymentMethodLabel, suggestedPaymentMethod } from '../../config/bruneiMoneyOptions';
import { useAuth } from '../../contexts/AuthContext';
import { listAccounts } from '../../repositories/accountRepository';
import {
  createSharedBillAssignments,
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
  transferSpaceOwnership,
  updateSpaceCollaborationSettings,
  updateSpaceMember,
  uploadSharedBillProof,
} from '../../repositories/collaborationRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import { getSmePosSettings, listSmePosAccess } from '../../repositories/smePosRepository';
import type {
  Account,
  Commitment,
  PaymentMethodCode,
  SharedBillAssignment,
  SharedBillPayment,
  SharedBillSettlementMode,
  Space,
  SpaceActivity,
  SmePosAccess,
  SmePosMode,
  SmePosRole,
  SpaceInvitation,
  SpaceMember,
  SpaceRole,
  UserNotification,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

const editableRoles: Array<Exclude<SpaceRole, 'owner' | 'member'>> = ['admin', 'contributor', 'payer', 'viewer'];
const roleLabel: Record<string, string> = { owner: 'Owner', admin: 'Manager', contributor: 'Add money records', payer: 'Record payments', viewer: 'View only', member: 'Member' };
const roleDescription: Record<Exclude<SpaceRole, 'owner' | 'member'>, string> = {
  admin: 'Manage members, Space settings, and shared records.',
  contributor: 'Add and update shared money records.',
  payer: 'Record payments assigned to them.',
  viewer: 'View shared information without changing anything.',
};
const smePosRoleLabel: Record<SmePosRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
  stock_staff: 'Stock staff',
  seller: 'Seller',
  viewer: 'View only',
};
const smePosRoleDescription: Record<Exclude<SmePosRole, 'owner'>, string> = {
  manager: 'Manage the shop, team, products, stock, customers, sales, returns, and payouts.',
  cashier: 'Use the register, take payment, and issue receipts.',
  stock_staff: 'Add products, receive stock, and update stock counts.',
  seller: 'See only the Marketplace seller account linked to this login.',
  viewer: 'View permitted shop information without making changes.',
};
const smePosSpaceRole: Record<Exclude<SmePosRole, 'owner'>, Exclude<SpaceRole, 'owner' | 'member'>> = {
  manager: 'admin',
  cashier: 'viewer',
  stock_staff: 'viewer',
  seller: 'viewer',
  viewer: 'viewer',
};
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
  return `https://wa.me/${digits ? digits : ''}?text=${encodeURIComponent(message)}`;
}
function settledAmount(assignment: SharedBillAssignment) { return assignment.settledMinor || 0; }
function outstandingAmount(assignment: SharedBillAssignment) {
  return assignment.outstandingMinor ?? Math.max(0, assignment.assignedMinor - settledAmount(assignment));
}

function isInternalUid(value?: string) {
  const normalized = value?.trim() || '';
  return Boolean(normalized && /^[A-Za-z0-9]{20,}$/.test(normalized));
}

function memberDisplayLabel(member: SpaceMember) {
  const displayName = member.displayName?.trim() || '';

  return displayName && !isInternalUid(displayName)
    ? displayName
    : 'Member';
}

function memberDetailLabel(member: SpaceMember) {
  const email = member.email?.trim() || '';

  return email && !isInternalUid(email)
    ? email
    : 'Profile details unavailable';
}

export type CollaborationTab = 'members' | 'bills' | 'activity' | 'settings';

type CollaborationConfirmation =
  | { kind: 'remove-member'; member: SpaceMember }
  | { kind: 'transfer-owner'; member: SpaceMember }
  | { kind: 'reverse-payment'; payment: SharedBillPayment };

interface CollaborationPageProps {
  spaceIdOverride?: string;
  activeTab?: CollaborationTab;
  embedded?: boolean;
  onSpaceUpdated?: () => Promise<void> | void;
}

export function CollaborationPage({
  spaceIdOverride,
  activeTab,
  embedded = false,
  onSpaceUpdated,
}: CollaborationPageProps = {}) {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState('');
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [posAccess, setPosAccess] = useState<SmePosAccess[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [assignments, setAssignments] = useState<SharedBillAssignment[]>([]);
  const [payments, setPayments] = useState<SharedBillPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [activities, setActivities] = useState<SpaceActivity[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [tab, setTab] = useState<Exclude<CollaborationTab, 'settings'>>('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<SpaceMember | null>(null);
  const [submitting, setSubmitting] = useState<SharedBillAssignment | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ActionConfirmState<CollaborationConfirmation> | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedSpace = spaces.find((item) => item.id === spaceId) || null;
  const displayTab: CollaborationTab = activeTab || tab;
  const currentMember = members.find((item) => item.uid === user?.uid) || null;
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const isOwner = currentMember?.role === 'owner';
  const activeMembers = members.filter((item) => (item.status || 'active') === 'active');
  const unreadForSpace = notifications.filter((item) => item.spaceId === spaceId);
  const pendingAssignments = assignments.filter((item) => item.status !== 'paid');
  const paymentMap = useMemo(() => new Map(payments.map((item) => [item.id, item])), [payments]);
  const posAccessByUid = useMemo(() => new Map(posAccess.map((item) => [item.uid, item])), [posAccess]);

  const loadSpaces = async () => {
    if (!user) return;
    const next = (await listSpaces(user.uid)).filter((item) => !item.archivedAt && item.type !== 'personal');
    setSpaces(next);
    setSpaceId((current) => {
      if (spaceIdOverride && next.some((item) => item.id === spaceIdOverride)) return spaceIdOverride;
      return current && next.some((item) => item.id === current) ? current : next[0]?.id || '';
    });
  };

  const loadSpaceData = async (selectedId: string) => {
    if (!user || !selectedId) return;
    setLoading(true);
    setError('');
    try {
      const nextMembers = await listSpaceMembers(selectedId);
      const signedInMember = nextMembers.find((member) => member.uid === user.uid);
      const selected = spaces.find((item) => item.id === selectedId);
      const mayManageInvitations = signedInMember?.role === 'owner' || signedInMember?.role === 'admin';
      const mayReadPosTeam = selected?.type === 'sme' && signedInMember?.role === 'owner';
      const [nextInvitations, nextAssignments, nextPayments, nextCommitments, nextActivities, nextNotifications, nextAccounts, nextPosAccess] = await Promise.all([
        mayManageInvitations ? listSpaceInvitations(selectedId) : Promise.resolve([] as SpaceInvitation[]),
        listSharedBillAssignments(selectedId),
        listSharedBillPayments(selectedId),
        listSpaceCommitments(selectedId),
        listSpaceActivities(selectedId),
        listUserNotifications(user.uid),
        listAccounts(user.uid),
        mayReadPosTeam ? listSmePosAccess(selectedId) : Promise.resolve([] as SmePosAccess[]),
      ]);
      setMembers(nextMembers);
      setPosAccess(nextPosAccess);
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

  useEffect(() => { void loadSpaces(); }, [user, spaceIdOverride]);
  useEffect(() => {
    if (spaceIdOverride) setSpaceId(spaceIdOverride);
  }, [spaceIdOverride]);
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

  const runConfirmedAction = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    setError('');
    try {
      if (confirmDialog.payload.kind === 'remove-member') {
        await removeSpaceMember(spaceId, confirmDialog.payload.member.uid);
      } else if (confirmDialog.payload.kind === 'transfer-owner') {
        await transferSpaceOwnership(spaceId, confirmDialog.payload.member.uid);
      } else {
        await reverseSharedBillPayment({
          paymentId: confirmDialog.payload.payment.id,
          reversalDate: today(),
          reason: 'Undone from Space',
        });
      }
      setConfirmDialog(null);
      await loadSpaceData(spaceId);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setConfirmBusy(false);
    }
  };

  if (!loading && spaces.length === 0) {
    const emptyContent = <>
      {!embedded && <PageHeader eyebrow="Share with others" title="Shared Spaces" description="Invite family, friends, or team members inside a Space." />}
      <div className="info-banner"><strong>{spaceIdOverride ? 'This Space is not available' : 'No shared Space yet'}</strong><span>{spaceIdOverride ? 'Go back to Spaces and choose another Space.' : 'Create a non-personal Space first, then invite members and share bills.'}</span></div>
      <Link className="button primary" to="/spaces">Back to Spaces</Link>
    </>;
    return embedded ? <section className="space-collaboration-embedded">{emptyContent}</section> : <main className="page">{emptyContent}</main>;
  }

  const Root = embedded ? 'section' : 'main';

  return <Root className={embedded ? 'space-collaboration-embedded' : 'page collaboration-page'}>
    {!embedded && <PageHeader
      eyebrow="Shared money"
      title="Shared Spaces"
      description="Manage members and shared bills inside the selected Space."
      action={canManage ? <button className="button primary" onClick={() => setInviteOpen(true)}>Invite member</button> : undefined}
    />}
    {error && <div className="notice error">{error}</div>}

    {!embedded && <section className="collaboration-space-bar">
      <label>Choose a shared Space<select value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>{spaces.map((space) => <option value={space.id} key={space.id}>{space.name} — {space.type}</option>)}</select></label>
      {selectedSpace && <div className="collaboration-space-summary"><strong>{selectedSpace.name}</strong><span>{roleLabel[currentMember?.role || 'viewer']} · {selectedSpace.collaborationMode === 'private' ? 'Private' : 'Shared'}</span></div>}
      {unreadForSpace.length > 0 && <button className="notification-pill" onClick={() => void runAction(async () => {
        await Promise.all(unreadForSpace.map((item) => markNotificationRead(item.id)));
      })}>{unreadForSpace.length} new</button>}
    </section>}

    {selectedSpace && canManage && (!embedded || displayTab === 'settings') && <CollaborationSettings space={selectedSpace} onSaved={async () => {
      await loadSpaces();
      await loadSpaceData(spaceId);
      await onSpaceUpdated?.();
    }} />}
    {embedded && displayTab === 'settings' && !canManage && <div className="notice">Only the Space owner or manager can change these settings.</div>}

    {!embedded && <section className="summary-grid collaboration-summary">
      <article className="summary-card featured"><span>Active members</span><strong>{activeMembers.length}</strong><small>Including the Space owner</small></article>
      <article className="summary-card"><span>Invites not accepted</span><strong>{invitations.filter((item) => item.status === 'pending').length}</strong><small>Waiting for the person to join</small></article>
      <article className="summary-card"><span>Bills still open</span><strong>{pendingAssignments.length}</strong><small>Not paid, partly paid, or waiting for a check</small></article>
      <article className="summary-card"><span>Payment check</span><strong>{selectedSpace?.approvalMode === 'owner_approval' ? 'Owner checks' : 'Automatic'}</strong><small>How member payments are checked</small></article>
    </section>}

    {!embedded && <div className="segmented-control planning-filter collaboration-tabs">
      <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Members</button>
      <button className={tab === 'bills' ? 'active' : ''} onClick={() => setTab('bills')}>Shared bills</button>
      <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Activity</button>
    </div>}

    {loading ? <div className="loading-panel">Loading Space information…</div> : displayTab === 'settings' ? null : displayTab === 'members' ? <>
      <section className="panel collaboration-panel">
        <div className="panel-heading"><div><span className="eyebrow">Access</span><h2>Members</h2></div>{embedded && canManage && <button className="button primary" onClick={() => setInviteOpen(true)}>Invite member</button>}</div>
        <div className="member-list">{members.map((member) => <article className={`member-row status-${member.status || 'active'}`} key={member.id}>
          <span className="avatar">{memberDisplayLabel(member).charAt(0).toUpperCase()}</span>
          <div><strong>{memberDisplayLabel(member)}</strong><small>{memberDetailLabel(member)}</small></div>
          <span className="type-badge">{selectedSpace?.type === 'sme' && member.role !== 'owner' && posAccessByUid.get(member.uid)?.role ? smePosRoleLabel[posAccessByUid.get(member.uid)!.role] : roleLabel[member.role] || member.role}</span>
          <div className="permission-chips member-access-summary"><span>{selectedSpace?.type === 'sme' && member.role !== 'owner' && posAccessByUid.get(member.uid)?.role ? smePosRoleDescription[posAccessByUid.get(member.uid)!.role as Exclude<SmePosRole, 'owner'>] : member.role === 'owner' ? 'Full control of this Space.' : roleDescription[member.role as Exclude<SpaceRole, 'owner' | 'member'>] || 'Shared Space access.'}</span></div>
          {canManage && member.role !== 'owner' && <div className="button-row">
            <button className="text-button" onClick={() => setEditingMember(member)}>Manage</button>
            {isOwner && (member.status || 'active') === 'active' && <button className="text-button" onClick={() => setConfirmDialog({
              payload: { kind: 'transfer-owner', member },
              title: `Make ${memberDisplayLabel(member)} the owner?`,
              description: 'They will become the Space owner. You will remain as a manager and can then delete your BajetBN account without removing this shared history.',
              note: 'Only transfer ownership to someone you trust. The new owner will control members and Space settings.',
              confirmLabel: 'Transfer ownership',
            })}>Make owner</button>}
            <button className="text-button danger" onClick={() => setConfirmDialog({
              payload: { kind: 'remove-member', member },
              title: `Remove ${memberDisplayLabel(member)}?`,
              description: 'They will lose access to this Space. Their previous shared bills, payments and activity will stay in the history.',
              note: 'You can invite them again later if needed.',
              confirmLabel: 'Remove member',
              tone: 'danger',
            })}>Remove</button>
          </div>}
        </article>)}</div>
      </section>
      {canManage && <section className="panel collaboration-panel">
        <div className="panel-heading"><div><span className="eyebrow">Invitations</span><h2>Invitations</h2></div></div>
        <div className="invitation-list">{invitations.length === 0 ? <p>No invitations yet.</p> : invitations.map((invitation) => <article key={invitation.id} className="invitation-row">
          <div><strong>{invitation.email}</strong><small>{invitation.posRole ? smePosRoleLabel[invitation.posRole] : roleLabel[invitation.role]} · {invitation.status}</small></div>
          {invitation.status === 'pending' && <><button className="button secondary" onClick={() => void navigator.clipboard.writeText(inviteUrl(invitation.token))}>Copy invite link</button><a className="button secondary" href={`https://wa.me/?text=${encodeURIComponent(`Join ${selectedSpace?.name || 'my BajetBN Space'}: ${inviteUrl(invitation.token)}`)}`} target="_blank" rel="noreferrer">WhatsApp</a><button className="text-button danger" onClick={() => void runAction(() => revokeSpaceInvitation(invitation.id))}>Cancel invite</button></>}
        </article>)}</div>
      </section>}
    </> : displayTab === 'bills' ? <section className="panel collaboration-panel">
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
          <div className="transaction-preview"><div><span>Paid</span><strong>{formatMoney(settled, assignment.currency)}</strong></div><div><span>Left to pay</span><strong>{formatMoney(outstanding, assignment.currency)}</strong></div>{currentPayment && <small>Payment {currentPayment.displayId}: {formatMoney(currentPayment.amountMinor, currentPayment.currency)} · {paymentMethodLabel(currentPayment.paymentMethod, currentPayment.paymentMethodLabel)}</small>}{lastPayment && !currentPayment && <small>Last payment {lastPayment.displayId}: {lastPayment.settlementMode === 'account' ? 'Account updated' : 'Paid another way'}.</small>}</div>
          {assignment.note && <p>{assignment.note}</p>}
          <div className="button-row">
            {maySubmit && <button className="button primary" onClick={() => setSubmitting(assignment)}>{assignment.status === 'confirmed' ? 'Finish old payment' : 'Add payment'}</button>}
            {proofPath && <button className="button secondary" onClick={() => void getSharedBillProofUrl(proofPath).then((url) => window.open(url, '_blank', 'noopener,noreferrer'))}>View proof</button>}
            {whatsapp && isMine && (assignment.status === 'submitted' || assignment.status === 'partially_paid' || assignment.status === 'paid') && <a className="button secondary" href={whatsapp} target="_blank" rel="noreferrer">Tell group head on WhatsApp</a>}
            {canReview && currentPayment && <><button className="button primary" onClick={() => void runAction(() => reviewSharedBillPayment({ paymentId: currentPayment.id, decision: 'confirmed' }))}>Confirm payment</button><button className="button danger-outline" onClick={() => void runAction(() => reviewSharedBillPayment({ paymentId: currentPayment.id, decision: 'rejected' }))}>Decline</button></>}
            {canReverse && lastPayment && <button className="button danger-outline" onClick={() => setConfirmDialog({
              payload: { kind: 'reverse-payment', payment: lastPayment },
              title: `Undo ${lastPayment.displayId}?`,
              description: 'The payment will be reversed and the shared bill will open again.',
              note: lastPayment.settlementMode === 'account' ? 'The linked BajetBN account balance will be restored.' : 'No BajetBN account balance was changed by this payment.',
              confirmLabel: 'Undo shared-bill payment',
              tone: 'danger',
            })}>Undo payment</button>}
          </div>
        </article>;
      })}</div>
    </section> : <section className="panel collaboration-panel">
      <div className="panel-heading"><div><span className="eyebrow">History</span><h2>Recent activity</h2></div></div>
      <div className="activity-list">{activities.length === 0 ? <p>No activity recorded yet.</p> : activities.map((activity) => <article key={activity.id}><span className="activity-dot"/><div><strong>{activity.summary}</strong><small>{activity.actorName || activity.actorUid} · {activity.createdAt?.toDate?.().toLocaleString() || 'recently'}</small></div></article>)}</div>
    </section>}

    {confirmDialog && <ActionConfirmModal state={confirmDialog} busy={confirmBusy} error={error} onClose={() => { setConfirmDialog(null); setError(''); }} onConfirm={() => void runConfirmedAction()} />}
    {inviteOpen && selectedSpace && <Modal title={`Invite person to ${selectedSpace.name}`} onClose={() => setInviteOpen(false)}><InviteForm space={selectedSpace} canAssignPosRole={isOwner} onSaved={async () => { setInviteOpen(false); await loadSpaceData(spaceId); }} /></Modal>}
    {editingMember && <Modal title="Change member access" onClose={() => setEditingMember(null)}><MemberForm member={editingMember} onSaved={async () => { setEditingMember(null); await loadSpaceData(spaceId); }} /></Modal>}
    {assignmentOpen && selectedSpace && <Modal title="Give a bill share" onClose={() => setAssignmentOpen(false)}><AssignmentForm space={selectedSpace} members={activeMembers} commitments={commitments} onSaved={async () => { setAssignmentOpen(false); await loadSpaceData(spaceId); }} /></Modal>}
    {submitting && <Modal title={`Add payment for ${submitting.commitmentName}`} onClose={() => setSubmitting(null)}><SubmitPaymentForm assignment={submitting} accounts={accounts.filter((account) => account.currency === submitting.currency)} onSaved={async () => { setSubmitting(null); await loadSpaceData(spaceId); }} /></Modal>}
  </Root>;
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

export function InviteForm({
  space,
  canAssignPosRole = false,
  defaultPosRole,
  onSaved,
}: {
  space: Space;
  canAssignPosRole?: boolean;
  defaultPosRole?: Exclude<SmePosRole, 'owner'>;
  onSaved: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<SpaceRole, 'owner' | 'member'>>('contributor');
  const [posRole, setPosRole] = useState<Exclude<SmePosRole, 'owner'>>(defaultPosRole || 'cashier');
  const [posMode, setPosMode] = useState<SmePosMode | null>(null);
  const [posChecked, setPosChecked] = useState(space.type !== 'sme' || !canAssignPosRole);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [canUseAccounts, setCanUseAccounts] = useState(false);
  const [canViewBalances, setCanViewBalances] = useState(false);
  const [canViewLedger, setCanViewLedger] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (space.type !== 'sme' || !canAssignPosRole) {
      setPosMode(null);
      setPosChecked(true);
      return () => { active = false; };
    }
    setPosChecked(false);
    void getSmePosSettings(space.id)
      .then((settings) => {
        if (!active) return;
        setPosMode(settings?.mode || null);
        setPosChecked(true);
        if (settings?.mode === 'standard' && posRole === 'seller') setPosRole('cashier');
      })
      .catch((nextError) => {
        if (!active) return;
        setPosMode(null);
        setPosChecked(true);
        setError(getErrorMessage(nextError));
      });
    return () => { active = false; };
  }, [space.id, space.type, canAssignPosRole]);

  const checkingBusinessRoles = space.type === 'sme' && canAssignPosRole && !posChecked;
  const businessInvite = space.type === 'sme' && canAssignPosRole && Boolean(posMode);
  const availablePosRoles: Array<Exclude<SmePosRole, 'owner'>> = [
    'manager',
    'cashier',
    'stock_staff',
    ...(posMode === 'marketplace_consignment' ? ['seller' as const] : []),
    'viewer',
  ];

  const chooseRole = (nextRole: Exclude<SpaceRole, 'owner' | 'member'>) => {
    setRole(nextRole);
    if (nextRole === 'viewer') {
      setCanUseAccounts(false);
      setCanViewBalances(false);
      setCanViewLedger(false);
    }
  };

  const chooseBusinessRole = (nextRole: Exclude<SmePosRole, 'owner'>) => {
    setPosRole(nextRole);
    const nextSpaceRole = smePosSpaceRole[nextRole];
    setRole(nextSpaceRole);
    if (nextSpaceRole === 'viewer') {
      setCanUseAccounts(false);
      setCanViewBalances(false);
      setCanViewLedger(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!posChecked) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const delivery = submitter?.value === 'copy' ? 'copy' : 'whatsapp';
    const whatsappWindow = delivery === 'whatsapp' ? window.open('about:blank', '_blank') : null;
    if (whatsappWindow) whatsappWindow.opener = null;
    setBusy(true);
    setError('');
    try {
      const effectiveRole = businessInvite ? smePosSpaceRole[posRole] : role;
      const result = await createSpaceInvitation({
        spaceId: space.id,
        email,
        role: effectiveRole,
        canUseAccounts: effectiveRole === 'viewer' ? false : canUseAccounts,
        canViewBalances: effectiveRole === 'viewer' ? false : canViewBalances,
        canViewLedger: effectiveRole === 'viewer' ? false : canViewLedger,
        posRole: businessInvite ? posRole : null,
      });
      const url = inviteUrl(result.data.token);
      const accessLabel = businessInvite ? smePosRoleLabel[posRole] : roleLabel[effectiveRole];
      if (delivery === 'whatsapp') {
        const href = whatsappHref(whatsappNumber, `Join ${space.name} in BajetBN as ${accessLabel}: ${url}`);
        if (whatsappWindow) whatsappWindow.location.href = href;
        else window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        await navigator.clipboard.writeText(url);
      }
      await onSaved();
    } catch (nextError) {
      whatsappWindow?.close();
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return <form className="form-stack invite-member-form" onSubmit={submit}>
    {error && <div className="notice error">{error}</div>}
    {checkingBusinessRoles
      ? <div className="info-banner"><strong>Preparing SME roles</strong><span>Loading this shop's team roles before the invitation is created.</span></div>
      : businessInvite
        ? <div className="info-banner"><strong>One invitation for the SME team</strong><span>Choose the person's shop role here. BajetBN will add their SME Space membership and POS access together when they join.</span></div>
        : <div className="info-banner"><strong>How invitations work</strong><span>The person joins using this email. Send the secure link directly through WhatsApp or copy it.</span></div>}
    {space.type === 'sme' && canAssignPosRole && posChecked && !posMode && <div className="notice">POS is not set up yet. You can invite normal SME Space members here. Set up POS first to invite Cashiers, Stock Staff, or Sellers.</div>}
    <div className="form-grid">
      <label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" /><small>They must sign in to BajetBN using this email.</small></label>
      <label>WhatsApp number <span className="optional-label">Optional</span><input value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} inputMode="tel" placeholder="6738XXXXXX" /><small>Leave blank to choose a WhatsApp contact later.</small></label>
    </div>
    {checkingBusinessRoles ? <div className="loading-panel">Loading business roles…</div> : businessInvite ? <fieldset className="invite-role-fieldset">
      <legend>What is their role in this business?</legend>
      <div className="invite-role-grid">{availablePosRoles.map((item) => <button key={item} className={`invite-role-card ${posRole === item ? 'selected' : ''}`} type="button" aria-pressed={posRole === item} onClick={() => chooseBusinessRole(item)}><strong>{smePosRoleLabel[item]}</strong><small>{smePosRoleDescription[item]}</small></button>)}</div>
    </fieldset> : <fieldset className="invite-role-fieldset">
      <legend>What can this person do?</legend>
      <div className="invite-role-grid">{editableRoles.map((item) => <button key={item} className={`invite-role-card ${role === item ? 'selected' : ''}`} type="button" aria-pressed={role === item} onClick={() => chooseRole(item)}><strong>{roleLabel[item]}</strong><small>{roleDescription[item]}</small></button>)}</div>
    </fieldset>}
    <details className="invite-account-access">
      <summary>Advanced financial access <span>Optional</span></summary>
      <p>Most team members do not need these permissions. Turn them on only when this person also works with shared BajetBN Accounts.</p>
      <div className="permission-editor">
        <label><input type="checkbox" checked={canUseAccounts} disabled={(businessInvite ? smePosSpaceRole[posRole] : role) === 'viewer'} onChange={(event) => setCanUseAccounts(event.target.checked)}/><span><strong>Use shared accounts</strong><small>Choose a shared Account when recording money.</small></span></label>
        <label><input type="checkbox" checked={canViewBalances} disabled={(businessInvite ? smePosSpaceRole[posRole] : role) === 'viewer'} onChange={(event) => setCanViewBalances(event.target.checked)}/><span><strong>See account balances</strong><small>See how much money is available.</small></span></label>
        <label><input type="checkbox" checked={canViewLedger} disabled={(businessInvite ? smePosSpaceRole[posRole] : role) === 'viewer'} onChange={(event) => setCanViewLedger(event.target.checked)}/><span><strong>See account activity</strong><small>See money going in and out.</small></span></label>
      </div>
    </details>
    <div className="invite-action-grid">
      <button className="button primary" type="submit" value="whatsapp" disabled={busy || !posChecked}>{busy ? 'Creating invite…' : 'Create & send with WhatsApp'}</button>
      <button className="button secondary" type="submit" value="copy" disabled={busy || !posChecked}>{busy ? 'Creating invite…' : 'Create & copy link'}</button>
    </div>
    <small className="form-help">WhatsApp will open with a ready message. You still choose the contact and press Send.</small>
  </form>;
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
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>(() => Object.fromEntries(members.map((item) => [item.uid, true])));
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [dueDate, setDueDate] = useState(commitments[0]?.nextDueDate || today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = commitments.find((item) => item.id === commitmentId);
  const chosen = members.filter((member) => selectedMembers[member.uid]);

  useEffect(() => {
    if (selected) setDueDate(selected.nextDueDate || selected.startDate);
  }, [commitmentId, selected]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!selected) throw new Error('Choose a bill or instalment.');
      if (chosen.length === 0) throw new Error('Choose at least one person.');
      let assignments: Array<{ memberUid: string; assignedMinor: number }>;
      if (splitMode === 'equal') {
        const base = Math.floor(selected.amountMinor / chosen.length);
        let remainder = selected.amountMinor - (base * chosen.length);
        assignments = chosen.map((member) => {
          const assignedMinor = base + (remainder > 0 ? 1 : 0);
          remainder = Math.max(0, remainder - 1);
          return { memberUid: member.uid, assignedMinor };
        });
      } else {
        assignments = chosen.map((member) => ({ memberUid: member.uid, assignedMinor: toMinorUnits(amounts[member.uid] || '0') }));
        if (assignments.some((item) => item.assignedMinor <= 0)) throw new Error('Enter an amount greater than BND 0.00 for each selected person.');
        const total = assignments.reduce((sum, item) => sum + item.assignedMinor, 0);
        if (total > selected.amountMinor) throw new Error('The member shares cannot be more than the amount due.');
      }
      await createSharedBillAssignments({ spaceId: space.id, commitmentId, assignments, dueDate, note });
      await onSaved();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <form className="form-stack" onSubmit={submit}>
    {error && <div className="notice error">{error}</div>}
    {commitments.length === 0 || members.length === 0 ? <div className="notice">Add a bill and invite at least one person before sharing the bill.</div> : <>
      <label>Bill or instalment<select value={commitmentId} onChange={(event) => setCommitmentId(event.target.value)}>{commitments.map((item) => <option value={item.id} key={item.id}>{item.name} — {formatMoney(item.amountMinor, item.currency)}</option>)}</select></label>
      <label>How should it be shared?<select value={splitMode} onChange={(event) => setSplitMode(event.target.value as 'equal' | 'custom')}><option value="equal">Split equally</option><option value="custom">Enter different amounts</option></select></label>
      <fieldset className="member-split-fieldset"><legend>Who should pay?</legend>{members.map((member) => <div className="member-split-row" key={member.uid}><label className="checkbox-label"><input type="checkbox" checked={Boolean(selectedMembers[member.uid])} onChange={(event) => setSelectedMembers((current) => ({ ...current, [member.uid]: event.target.checked }))} /> {memberDisplayLabel(member)}{member.role === 'owner' ? ' (Owner)' : ''}</label>{splitMode === 'custom' && selectedMembers[member.uid] && <input aria-label={`${member.displayName || member.email || 'Member'} share`} inputMode="decimal" placeholder="BND" value={amounts[member.uid] || ''} onChange={(event) => setAmounts((current) => ({ ...current, [member.uid]: event.target.value }))} />}</div>)}</fieldset>
      {selected && <div className="transaction-preview"><div><span>Amount due</span><strong>{formatMoney(selected.amountMinor, selected.currency)}</strong></div><div><span>People selected</span><strong>{chosen.length}</strong></div><small>{splitMode === 'equal' ? 'BajetBN will divide the full amount equally, including any 1-cent difference.' : 'The amounts can be different, but cannot be more than the bill amount.'}</small></div>}
      <label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required readOnly /></label>
      <label>Note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <button className="button primary full" disabled={busy}>{busy ? 'Saving…' : `Give bill share${chosen.length === 1 ? '' : 's'}`}</button>
    </>}
  </form>;
}

function SubmitPaymentForm({ assignment, accounts, onSaved }: { assignment: SharedBillAssignment; accounts: Account[]; onSaved: () => Promise<void> }) {
  const outstanding = outstandingAmount(assignment);
  const [amount, setAmount] = useState(String(outstanding / 100));
  const [settlementMode, setSettlementMode] = useState<SharedBillSettlementMode>(accounts.length ? 'account' : 'external');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>(suggestedPaymentMethod(accounts[0]));
  const [paymentMethodCustom, setPaymentMethodCustom] = useState('');
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
      await submitSharedBillPayment({ assignmentId: assignment.id, amountMinor, settlementMode, accountId: settlementMode === 'account' ? accountId : undefined, paymentMethod, paymentMethodLabel: paymentMethod === 'other' ? paymentMethodCustom.trim() : undefined, paymentDate, ...proof, note });
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
    {settlementMode === 'account' ? <><label>Account used<select value={accountId} onChange={(event) => { const nextId = event.target.value; setAccountId(nextId); setPaymentMethod(suggestedPaymentMethod(accounts.find((account) => account.id === nextId))); setPaymentMethodCustom(''); }} required>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name} — {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label><div className="notice">After the payment is confirmed, BajetBN records the expense and updates this account once.</div></> : <div className="notice">This marks the shared bill as paid without changing any BajetBN account balance.</div>}
    <PaymentMethodField value={paymentMethod} customLabel={paymentMethodCustom} onChange={(value, custom) => { setPaymentMethod(value); setPaymentMethodCustom(custom); }} />
    <label>Payment date<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required/></label>
    <label>Proof of payment<input type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)}/><small>Optional unless your group requires it. Images and PDFs up to 10 MB.</small></label>
    <label>Note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Receipt number or short message"/></label>
    <button className="button primary full" disabled={busy}>{busy ? 'Sending…' : 'Send payment details'}</button>
  </form>;
}
