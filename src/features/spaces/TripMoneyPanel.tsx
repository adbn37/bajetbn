import { useEffect, useState, type FormEvent } from 'react';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { Modal } from '../../components/Modal';
import {
  getSpaceFund,
  listSpaceFundContributions,
  recordTripMoneyContribution,
  reverseTripMoneyContribution,
  updateTripMoneySettings,
} from '../../repositories/sharedExpenseRepository';
import type { Space, SpaceFund, SpaceFundContribution, SpaceMember } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

function today() { return new Date().toISOString().slice(0, 10); }
function memberLabel(member?: SpaceMember | null) { return member?.displayName || member?.email || 'Member'; }

export function TripMoneyPanel({
  space,
  members,
  currentMember,
  canManage,
}: {
  space: Space;
  members: SpaceMember[];
  currentMember: SpaceMember | null;
  canManage: boolean;
}) {
  const [fund, setFund] = useState<SpaceFund | null>(null);
  const [contributions, setContributions] = useState<SpaceFundContribution[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [undoDialog, setUndoDialog] = useState<ActionConfirmState<SpaceFundContribution> | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeMembers = members.filter((item) => (item.status || 'active') === 'active');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [nextFund, nextContributions] = await Promise.all([getSpaceFund(space.id), listSpaceFundContributions(space.id)]);
      setFund(nextFund); setContributions(nextContributions);
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [space.id]);

  const runUndoContribution = async () => {
    if (!undoDialog) return;
    setUndoBusy(true);
    setError('');
    try {
      await reverseTripMoneyContribution(undoDialog.payload.id);
      setUndoDialog(null);
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setUndoBusy(false);
    }
  };

  if (loading) return <div className="loading-panel">Loading Trip money…</div>;

  return <section className="panel trip-money-panel">
    <div className="panel-heading"><div><span className="eyebrow">Group wallet</span><h2>Trip money</h2></div><div className="button-row">{canManage && <button className="button secondary" onClick={() => setSettingsOpen(true)}>{fund ? 'Change setup' : 'Set up Trip money'}</button>}<button className="button primary" onClick={() => setContributionOpen(true)} disabled={!fund}>Add contribution</button></div></div>
    {error && <div className="notice error">{error}</div>}
    {!fund ? <div className="info-banner"><strong>Set up the Trip money first</strong><span>Choose the trip budget and the person holding the collected money.</span></div> : <>
      <section className="summary-grid trip-money-summary">
        <article className="summary-card featured"><span>Trip budget</span><strong>{formatMoney(fund.budgetMinor, fund.currency)}</strong><small>Your spending limit</small></article>
        <article className="summary-card"><span>Money collected</span><strong>{formatMoney(fund.contributedMinor, fund.currency)}</strong><small>Contributions from members</small></article>
        <article className="summary-card"><span>Trip spending</span><strong>{formatMoney(fund.spentMinor, fund.currency)}</strong><small>Expenses marked as paid from Trip money</small></article>
        <article className="summary-card"><span>Money available</span><strong>{formatMoney(fund.availableMinor, fund.currency)}</strong><small>Held by {fund.holderName || fund.holderEmail || 'the selected person'}</small></article>
      </section>
      <div className="info-banner"><strong>{fund.holderName || fund.holderEmail || 'Selected member'} holds the Trip money</strong><span>When adding a shared expense, choose “Paid using collected Trip money” to reduce the available amount.</span></div>
      <div className="panel-heading subheading"><div><span className="eyebrow">Collected money</span><h2>Member contributions</h2></div></div>
      <div className="trip-contribution-list">{contributions.length === 0 ? <p>No contributions recorded yet.</p> : contributions.map((item) => <article className={`trip-contribution-row status-${item.status}`} key={item.id}>
        <div><strong>{item.memberName || item.memberEmail || 'Member'}</strong><small>{item.contributionDate} · {item.status === 'reversed' ? 'Undone' : item.displayId}</small></div>
        <strong>{formatMoney(item.amountMinor, item.currency)}</strong>
        {item.status === 'posted' && (canManage || currentMember?.uid === item.memberUid) && <button className="button danger-outline" onClick={() => setUndoDialog({ payload: item, title: `Undo ${item.displayId}?`, description: 'This contribution will be reversed if the collected money has not already been spent.', note: 'The original contribution stays in the history as an undone record.', confirmLabel: 'Undo contribution', tone: 'danger' })}>Undo</button>}
      </article>)}</div>
    </>}
    {undoDialog && <ActionConfirmModal state={undoDialog} busy={undoBusy} error={error} onClose={() => { setUndoDialog(null); setError(''); }} onConfirm={() => void runUndoContribution()} />}
    {settingsOpen && <Modal title="Set up Trip money" onClose={() => setSettingsOpen(false)}><TripMoneySettingsForm space={space} members={activeMembers} fund={fund} onSaved={async () => { setSettingsOpen(false); await load(); }} /></Modal>}
    {contributionOpen && fund && <Modal title="Add Trip contribution" onClose={() => setContributionOpen(false)}><TripContributionForm space={space} members={activeMembers} currentMember={currentMember} canManage={canManage} onSaved={async () => { setContributionOpen(false); await load(); }} /></Modal>}
  </section>;
}

function TripMoneySettingsForm({ space, members, fund, onSaved }: { space: Space; members: SpaceMember[]; fund: SpaceFund | null; onSaved: () => Promise<void> }) {
  const [budget, setBudget] = useState(String((fund?.budgetMinor || 0) / 100));
  const [holderUid, setHolderUid] = useState(fund?.holderUid || members[0]?.uid || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await updateTripMoneySettings({ spaceId: space.id, holderUid, budgetMinor: toMinorUnits(budget || '0') }); await onSaved(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Trip budget (BND)<input inputMode="decimal" required value={budget} onChange={(event) => setBudget(event.target.value)} /></label><label>Who is holding the money?<select required value={holderUid} onChange={(event) => setHolderUid(event.target.value)}>{members.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select></label><div className="notice">This is a group-money record. It does not move money between bank accounts.</div><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Save Trip setup'}</button></form>;
}

function TripContributionForm({ space, members, currentMember, canManage, onSaved }: { space: Space; members: SpaceMember[]; currentMember: SpaceMember | null; canManage: boolean; onSaved: () => Promise<void> }) {
  const [memberUid, setMemberUid] = useState(currentMember?.uid || members[0]?.uid || '');
  const [amount, setAmount] = useState('');
  const [contributionDate, setContributionDate] = useState(today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await recordTripMoneyContribution({ spaceId: space.id, memberUid, amountMinor: toMinorUnits(amount), contributionDate, note }); await onSaved(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Who added the money?<select value={memberUid} disabled={!canManage} onChange={(event) => setMemberUid(event.target.value)}>{members.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select></label><label>Amount added (BND)<input inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Date<input type="date" required value={contributionDate} onChange={(event) => setContributionDate(event.target.value)} /></label><label>Note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Add to Trip money'}</button></form>;
}
