import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  cancelSpaceApproval,
  requestSpaceApproval,
  reviewSpaceApproval,
  subscribeSpaceApprovals,
} from '../../repositories/spaceApprovalRepository';
import type {
  SpaceApproval,
  SpaceApprovalTargetType,
  SpaceMember,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

const targetLabels: Record<SpaceApprovalTargetType, string> = {
  expense: 'Expense',
  contribution_adjustment: 'Contribution adjustment',
  booking: 'Booking',
  household_purchase: 'Household purchase',
  sme_purchase: 'SME purchase',
  sme_payout: 'SME payout',
  custom_action: 'Custom Space action',
  other: 'Other',
};

function displayTime(value: { toDate?: () => Date } | null | undefined) {
  const date = value?.toDate?.();
  return date ? date.toLocaleString('en-BN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now';
}

function moneyLabel(amountMinor?: number | null, currency?: string | null) {
  if (amountMinor == null || !currency) return '';
  return new Intl.NumberFormat('en-BN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function SpaceApprovalsPanel({
  spaceId,
  currency,
  currentMember,
}: {
  spaceId: string;
  currency: string;
  currentMember: SpaceMember | null;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<SpaceApproval[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [targetType, setTargetType] = useState<SpaceApprovalTargetType>('other');
  const [targetId, setTargetId] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [amount, setAmount] = useState('');
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const activeMember = Boolean(currentMember && (currentMember.status || 'active') === 'active');
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  useEffect(() => {
    setError('');
    return subscribeSpaceApprovals(
      spaceId,
      setItems,
      (nextError) => setError(getErrorMessage(nextError)),
    );
  }, [spaceId]);

  const pending = useMemo(
    () => items.filter((item) => item.status === 'pending'),
    [items],
  );
  const decided = useMemo(
    () => items.filter((item) => item.status !== 'pending'),
    [items],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activeMember) return;

    const numericAmount = amount.trim() ? Number(amount) : null;
    if (numericAmount != null && (!Number.isFinite(numericAmount) || numericAmount < 0)) {
      setError('Enter a valid amount or leave it empty.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      await requestSpaceApproval({
        spaceId,
        title: title.trim(),
        requestNote: requestNote.trim(),
        targetType,
        targetId: targetId.trim() || null,
        targetPath: targetPath.trim() || null,
        amountMinor: numericAmount == null ? null : Math.round(numericAmount * 100),
        currency: numericAmount == null ? null : currency,
      });

      setTitle('');
      setRequestNote('');
      setTargetType('other');
      setTargetId('');
      setTargetPath('');
      setAmount('');
      setComposerOpen(false);
      setNotice('Approval request sent.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function decide(item: SpaceApproval, decision: 'approved' | 'rejected') {
    setBusyId(item.id);
    setError('');
    setNotice('');

    try {
      await reviewSpaceApproval({
        spaceId,
        approvalId: item.id,
        decision,
        decisionNote: (decisionNotes[item.id] || '').trim(),
      });
      setNotice(decision === 'approved' ? 'Request approved.' : 'Request rejected.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusyId('');
    }
  }

  async function cancel(item: SpaceApproval) {
    setBusyId(item.id);
    setError('');
    setNotice('');

    try {
      await cancelSpaceApproval({ spaceId, approvalId: item.id });
      setNotice('Approval request cancelled.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusyId('');
    }
  }

  function card(item: SpaceApproval) {
    const own = item.requestedBy === user?.uid;
    const canCancel = own && item.status === 'pending';
    const canReview = canManage && item.status === 'pending';

    return <article className={'space-approval-card status-' + item.status} key={item.id}>
      <div className="space-approval-heading">
        <div>
          <div className="badge-row">
            <span className="type-badge">{item.status}</span>
            <span className="type-badge">{targetLabels[item.targetType] || item.targetType}</span>
          </div>
          <h3>{item.title}</h3>
          <small>{item.requestedByName || 'Space member'} · {displayTime(item.requestedAt || item.createdAt)}</small>
        </div>
        {item.amountMinor != null && item.currency && <strong>{moneyLabel(item.amountMinor, item.currency)}</strong>}
      </div>

      {item.requestNote && <p>{item.requestNote}</p>}
      {(item.targetId || item.targetPath) && <div className="space-approval-target">
        {item.targetId && <small>Record: {item.targetId}</small>}
        {item.targetPath && <a href={item.targetPath}>Open related record</a>}
      </div>}

      {item.status !== 'pending' && <div className="space-approval-decision">
        <strong>{item.status === 'approved' ? 'Approved' : item.status === 'rejected' ? 'Rejected' : 'Cancelled'}</strong>
        {item.reviewedByName && <small> by {item.reviewedByName}</small>}
        {item.reviewedAt && <small> · {displayTime(item.reviewedAt)}</small>}
        {item.decisionNote && <p>{item.decisionNote}</p>}
      </div>}

      {canReview && <div className="space-approval-review">
        <label>Decision note <span className="muted">optional</span>
          <textarea
            rows={2}
            maxLength={1000}
            value={decisionNotes[item.id] || ''}
            onChange={(event) => setDecisionNotes((current) => ({ ...current, [item.id]: event.target.value }))}
            placeholder="Reason or context for the decision"
          />
        </label>
        <div className="button-row">
          <button className="button primary compact" type="button" disabled={busyId === item.id} onClick={() => void decide(item, 'approved')}>Approve</button>
          <button className="button secondary compact" type="button" disabled={busyId === item.id} onClick={() => void decide(item, 'rejected')}>Reject</button>
        </div>
      </div>}

      {canCancel && <div className="button-row">
        <button className="text-button danger" type="button" disabled={busyId === item.id} onClick={() => void cancel(item)}>Cancel request</button>
      </div>}
    </article>;
  }

  return <section className="space-approvals">
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Decisions</span>
          <h2>Approvals</h2>
          <p>Ask for a decision without duplicating or changing the related financial record.</p>
        </div>
        {activeMember && <button className="button primary" type="button" onClick={() => setComposerOpen((value) => !value)}>{composerOpen ? 'Close' : 'Request approval'}</button>}
      </div>

      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice success">{notice}</div>}
      {!activeMember && <div className="notice">Only active Space members can request approval.</div>}
      {!canManage && activeMember && <div className="notice">The Space owner or manager reviews pending requests.</div>}

      {composerOpen && activeMember && <form className="space-approval-composer" onSubmit={submit}>
        <label>What needs approval?
          <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Approve this booking change" />
        </label>
        <label>Related type
          <select value={targetType} onChange={(event) => setTargetType(event.target.value as SpaceApprovalTargetType)}>
            {Object.entries(targetLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Request note <span className="muted">optional</span>
          <textarea rows={3} maxLength={1200} value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="Explain what needs a decision." />
        </label>
        <div className="space-approval-grid">
          <label>Amount <span className="muted">optional</span>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
          </label>
          <label>Currency
            <input value={currency} disabled />
          </label>
        </div>
        <label>Related record ID <span className="muted">optional</span>
          <input maxLength={160} value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="Existing Expense, Booking, Payout, etc." />
        </label>
        <label>Related path <span className="muted">optional</span>
          <input maxLength={500} value={targetPath} onChange={(event) => setTargetPath(event.target.value)} placeholder="/spaces/.../related-record" />
        </label>
        <div className="button-row">
          <button className="button primary" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Request approval'}</button>
          <button className="button secondary" type="button" onClick={() => setComposerOpen(false)}>Cancel</button>
        </div>
      </form>}
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">Needs a decision</span><h2>Pending</h2></div><span className="type-badge">{pending.length}</span></div>
      {pending.length ? <div className="space-approval-list">{pending.map(card)}</div> : <div className="empty-state compact"><strong>No pending approvals</strong><p>New approval requests will appear here for the owner or manager to review.</p></div>}
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">History</span><h2>Decisions</h2></div></div>
      {decided.length ? <div className="space-approval-list">{decided.map(card)}</div> : <div className="empty-state compact"><strong>No decisions yet</strong><p>Approved, rejected and cancelled requests will stay here as Space history.</p></div>}
    </section>
  </section>;
}
