import { useEffect, useState, type FormEvent } from 'react';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { Modal } from '../../components/Modal';
import { PaymentMethodField } from '../../components/PaymentMethodField';
import {
  getSpaceFund,
  listSpaceFundContributions,
  recordSpaceFundContribution,
  reverseSpaceFundContribution,
  updateSpaceFundSettings,
} from '../../repositories/sharedExpenseRepository';
import type { PaymentMethodCode, Space, SpaceFund, SpaceFundContribution, SpaceMember } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

function today() { return new Date().toISOString().slice(0, 10); }
function memberLabel(member?: SpaceMember | null) { return member?.displayName || member?.email || 'Member'; }

export function spaceFundCopy(space: Pick<Space, 'type'>) {
  if (space.type === 'trip') return {
    title: 'Trip money',
    shortTitle: 'Trip money',
    setupTitle: 'Set up Trip money',
    targetLabel: 'Trip budget',
    spendingLabel: 'Trip spending',
    paidLabel: 'Paid using collected Trip money',
    setupDescription: 'Choose the trip budget and the person holding the collected money.',
    targetHelp: 'Your spending limit',
    expenseHelp: 'Expenses marked as paid from Trip money',
    saveLabel: 'Save Trip setup',
    addLabel: 'Add to Trip money',
    contributionTitle: 'Add Trip contribution',
    tab: 'trip_money',
  };
  if (space.type === 'household') return {
    title: 'Household fund',
    shortTitle: 'Household fund',
    setupTitle: 'Set up Household fund',
    targetLabel: 'Household fund target',
    spendingLabel: 'Household fund spending',
    paidLabel: 'Paid using collected Household fund',
    setupDescription: 'Choose an optional target and the person holding the collected household money.',
    targetHelp: 'Optional amount the household plans to collect',
    expenseHelp: 'Shared expenses paid using the Household fund',
    saveLabel: 'Save Household fund',
    addLabel: 'Add to Household fund',
    contributionTitle: 'Add Household contribution',
    tab: 'group_fund',
  };
  return {
    title: 'Group fund',
    shortTitle: 'Group fund',
    setupTitle: 'Set up Group fund',
    targetLabel: 'Group fund target',
    spendingLabel: 'Group fund spending',
    paidLabel: 'Paid using collected Group fund',
    setupDescription: 'Choose an optional target and the person holding the collected group money.',
    targetHelp: 'Optional amount the group plans to collect',
    expenseHelp: 'Shared expenses paid using the Group fund',
    saveLabel: 'Save Group fund',
    addLabel: 'Add to Group fund',
    contributionTitle: 'Add Group contribution',
    tab: 'group_fund',
  };
}

export function SpaceFundPanel({
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
  const copy = spaceFundCopy(space);
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
    setUndoBusy(true); setError('');
    try {
      await reverseSpaceFundContribution(undoDialog.payload.id);
      setUndoDialog(null);
      await load();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setUndoBusy(false); }
  };

  if (loading) return <div className="loading-panel">Loading {copy.shortTitle}…</div>;

  return <section className="panel trip-money-panel space-fund-panel">
    <div className="panel-heading"><div><span className="eyebrow">Optional shared money</span><h2>{copy.title}</h2></div><div className="button-row">{canManage && <button className="button secondary" onClick={() => setSettingsOpen(true)}>{fund ? 'Change setup' : copy.setupTitle}</button>}<button className="button primary" onClick={() => setContributionOpen(true)} disabled={!fund}>Add contribution</button></div></div>
    {error && <div className="notice error">{error}</div>}
    {!fund ? <div className="info-banner"><strong>{copy.setupTitle} when your group needs it</strong><span>{copy.setupDescription} Direct member-to-member payments and proof-only flows still remain available.</span></div> : <>
      <section className="summary-grid trip-money-summary">
        <article className="summary-card featured"><span>{copy.targetLabel}</span><strong>{formatMoney(fund.budgetMinor, fund.currency)}</strong><small>{copy.targetHelp}</small></article>
        <article className="summary-card"><span>Money collected</span><strong>{formatMoney(fund.contributedMinor, fund.currency)}</strong><small>Contributions from members</small></article>
        <article className="summary-card"><span>{copy.spendingLabel}</span><strong>{formatMoney(fund.spentMinor, fund.currency)}</strong><small>{copy.expenseHelp}</small></article>
        <article className="summary-card"><span>Money available</span><strong>{formatMoney(fund.availableMinor, fund.currency)}</strong><small>Held by {fund.holderName || fund.holderEmail || 'the selected person'}</small></article>
      </section>
      <div className="info-banner"><strong>{fund.holderName || fund.holderEmail || 'Selected member'} holds the collected money</strong><span>When adding a shared expense, choose “{copy.paidLabel}” to reduce the available amount. Other shared expenses can still use direct payments.</span></div>
      <div className="panel-heading subheading"><div><span className="eyebrow">Collected money</span><h2>Member contributions</h2></div></div>
      <div className="trip-contribution-list">{contributions.length === 0 ? <p>No contributions recorded yet.</p> : contributions.map((item) => <article className={`trip-contribution-row status-${item.status}`} key={item.id}>
        <div><strong>{item.memberName || item.memberEmail || 'Member'}</strong><small>{item.contributionDate} · {item.status === 'reversed' ? 'Undone' : item.displayId}</small></div>
        <strong>{formatMoney(item.amountMinor, item.currency)}</strong>
        {item.status === 'posted' && (canManage || currentMember?.uid === item.memberUid) && <button className="button danger-outline" onClick={() => setUndoDialog({ payload: item, title: `Undo ${item.displayId}?`, description: 'This contribution will be reversed if the collected money has not already been spent.', note: 'The original contribution stays in the history as an undone record.', confirmLabel: 'Undo contribution', tone: 'danger' })}>Undo</button>}
      </article>)}</div>
    </>}
    {undoDialog && <ActionConfirmModal state={undoDialog} busy={undoBusy} error={error} onClose={() => { setUndoDialog(null); setError(''); }} onConfirm={() => void runUndoContribution()} />}
    {settingsOpen && <Modal title={copy.setupTitle} onClose={() => setSettingsOpen(false)}><SpaceFundSettingsForm space={space} members={activeMembers} fund={fund} onSaved={async () => { setSettingsOpen(false); await load(); }} /></Modal>}
    {contributionOpen && fund && <Modal title={copy.contributionTitle} onClose={() => setContributionOpen(false)}><SpaceFundContributionForm space={space} members={activeMembers} currentMember={currentMember} canManage={canManage} onSaved={async () => { setContributionOpen(false); await load(); }} /></Modal>}
  </section>;
}

function SpaceFundSettingsForm({ space, members, fund, onSaved }: { space: Space; members: SpaceMember[]; fund: SpaceFund | null; onSaved: () => Promise<void> }) {
  const copy = spaceFundCopy(space);
  const [budget, setBudget] = useState(String((fund?.budgetMinor || 0) / 100));
  const [holderUid, setHolderUid] = useState(fund?.holderUid || members[0]?.uid || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await updateSpaceFundSettings({ spaceId: space.id, holderUid, budgetMinor: toMinorUnits(budget || '0') }); await onSaved(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>{copy.targetLabel} ({space.currency})<input inputMode="decimal" required value={budget} onChange={(event) => setBudget(event.target.value)} /></label><label>Who is holding the money?<select required value={holderUid} onChange={(event) => setHolderUid(event.target.value)}>{members.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select></label><div className="notice">This is a shared-money record. It does not move money between bank accounts.</div><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : copy.saveLabel}</button></form>;
}

function SpaceFundContributionForm({ space, members, currentMember, canManage, onSaved }: { space: Space; members: SpaceMember[]; currentMember: SpaceMember | null; canManage: boolean; onSaved: () => Promise<void> }) {
  const copy = spaceFundCopy(space);
  const [memberUid, setMemberUid] = useState(currentMember?.uid || members[0]?.uid || '');
  const [amount, setAmount] = useState('');
  const [contributionDate, setContributionDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('bank_transfer');
  const [paymentMethodCustom, setPaymentMethodCustom] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await recordSpaceFundContribution({ spaceId: space.id, memberUid, amountMinor: toMinorUnits(amount), contributionDate, paymentMethod, paymentMethodLabel: paymentMethod === 'other' ? paymentMethodCustom.trim() : undefined, note }); await onSaved(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Who added the money?<select value={memberUid} disabled={!canManage} onChange={(event) => setMemberUid(event.target.value)}>{members.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select></label><label>Amount added ({space.currency})<input inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label><PaymentMethodField value={paymentMethod} customLabel={paymentMethodCustom} onChange={(value, custom) => { setPaymentMethod(value); setPaymentMethodCustom(custom); }} /><label>Date<input type="date" required value={contributionDate} onChange={(event) => setContributionDate(event.target.value)} /></label><label>Note<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : copy.addLabel}</button></form>;
}
