import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LifecycleConfirmModal, type LifecycleConfirmState } from '../../components/LifecycleConfirmModal';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { createGoal, listAllGoals, listGoalContributions, recordGoalContribution, reverseGoalContribution, updateGoal } from '../../repositories/goalRepository';
import { manageGoal } from '../../repositories/lifecycleRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type { GoalContribution, SavingsGoal, Space } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

type GoalLifecycleAction = 'archive' | 'close' | 'delete';

function today() { return new Date().toISOString().slice(0, 10); }

export function GoalsPage() {
  const { user, profile } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]); const [spaces, setSpaces] = useState<Space[]>([]); const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [editing, setEditing] = useState<SavingsGoal | null>(null); const [contributing, setContributing] = useState<SavingsGoal | null>(null); const [showForm, setShowForm] = useState(false); const [busyId, setBusyId] = useState(''); const [error, setError] = useState('');
  const [lifecycleDialog, setLifecycleDialog] = useState<LifecycleConfirmState<SavingsGoal, GoalLifecycleAction> | null>(null);
  const load = async () => { if (!user) return; setError(''); try { const [nextGoals, nextSpaces, nextContributions] = await Promise.all([listAllGoals(user.uid), listSpaces(user.uid), listGoalContributions(user.uid)]); setGoals(nextGoals); setSpaces(nextSpaces.filter((item) => !item.archivedAt)); setContributions(nextContributions); } catch (nextError) { setError(getErrorMessage(nextError)); } };
  useEffect(() => { void load(); }, [user]);
  const active = useMemo(() => goals.filter((item) => !item.archivedAt && !item.closedAt), [goals]);
  const inactive = useMemo(() => goals.filter((item) => item.archivedAt || item.closedAt), [goals]);
  const target = active.reduce((sum, item) => sum + item.targetMinor, 0); const saved = active.reduce((sum, item) => sum + item.currentMinor, 0);

  function askLifecycle(goal: SavingsGoal, action: GoalLifecycleAction) {
    setError('');
    const state: Record<GoalLifecycleAction, LifecycleConfirmState<SavingsGoal, GoalLifecycleAction>> = {
      archive: { record: goal, action, title: `Archive ${goal.name}?`, description: 'It will move to Closed & Archived Goals and disappear from your current goals.', note: 'Previous progress will stay available.', confirmLabel: 'Archive goal' },
      close: { record: goal, action, title: `Close ${goal.name}?`, description: 'This goal will move to Closed & Archived Goals and no more progress can be added until it is restored.', note: 'Saved progress will remain unchanged.', confirmLabel: 'Close goal' },
      delete: { record: goal, action, title: `Delete ${goal.name} permanently?`, description: 'Permanent deletion only works when no progress has ever been saved.', note: 'This cannot be undone.', confirmLabel: 'Delete permanently', tone: 'danger' },
    };
    setLifecycleDialog(state[action]);
  }

  async function runLifecycle() {
    if (!lifecycleDialog) return;
    const { record: goal, action } = lifecycleDialog;
    setBusyId(goal.id); setError('');
    try { await manageGoal(goal.id, action); setLifecycleDialog(null); await load(); }
    catch (nextError) {
      const message = getErrorMessage(nextError);
      if (action === 'delete' && /(close|archive)/i.test(message)) {
        setLifecycleDialog({ record: goal, action: 'archive', title: `${goal.name} cannot be deleted`, description: message, note: 'Archive it instead. Its saved progress will remain available and reports will stay correct.', confirmLabel: 'Archive goal instead' });
      } else setError(message);
    }
    finally { setBusyId(''); }
  }


  return <main className="page"><PageHeader eyebrow="Planning" title="Savings goals" description="Track money you plan to save for emergencies, school, travel, equipment, or anything else." action={<div className="page-header-action-row"><Link className="button secondary archive-button" to="/goals/archived">Previous Goals <span>{inactive.length}</span></Link><button className="button primary" onClick={() => { setEditing(null); setShowForm(true); }}>Add savings goal</button></div>} />
    {error && <div className="notice error">{error}</div>}<section className="summary-grid"><article className="summary-card featured"><span>Total needed</span><strong>{formatMoney(target, profile?.currency || 'BND')}</strong><small>Across current goals</small></article><article className="summary-card"><span>Saved so far</span><strong>{formatMoney(saved, profile?.currency || 'BND')}</strong><small>Progress you entered</small></article><article className="summary-card"><span>Still needed</span><strong>{formatMoney(target - saved, profile?.currency || 'BND')}</strong><small>To finish all goals</small></article><article className="summary-card"><span>Closed or archived</span><strong>{inactive.length}</strong><small>Can be restored</small></article></section>
    <GoalGrid goals={active} spaces={spaces} contributions={contributions} busyId={busyId} onLoad={load} onEdit={(goal) => { setEditing(goal); setShowForm(true); }} onContribute={setContributing} onArchive={(goal) => askLifecycle(goal, 'archive')} onClose={(goal) => askLifecycle(goal, 'close')} onDelete={(goal) => askLifecycle(goal, 'delete')} />
    {lifecycleDialog && <LifecycleConfirmModal state={lifecycleDialog} busy={busyId === lifecycleDialog.record.id} error={error} onClose={() => { setLifecycleDialog(null); setError(''); }} onConfirm={() => void runLifecycle()} />}
    {showForm && <Modal title={editing ? 'Edit goal' : 'Add savings goal'} onClose={() => setShowForm(false)}><GoalForm goal={editing} spaces={spaces} onSaved={async () => { setShowForm(false); await load(); }} /></Modal>}
    {contributing && <Modal title={`Add progress to ${contributing.name}`} onClose={() => setContributing(null)}><ContributionForm goal={contributing} onSaved={async () => { setContributing(null); await load(); }} /></Modal>}
  </main>;
}

function GoalGrid({ goals, spaces, contributions, busyId, inactive = false, onLoad, onEdit, onContribute, onArchive, onClose, onDelete, onRestore }: { goals: SavingsGoal[]; spaces: Space[]; contributions: GoalContribution[]; busyId: string; inactive?: boolean; onLoad: () => Promise<void>; onEdit?: (goal: SavingsGoal) => void; onContribute?: (goal: SavingsGoal) => void; onArchive?: (goal: SavingsGoal) => void; onClose?: (goal: SavingsGoal) => void; onDelete?: (goal: SavingsGoal) => void; onRestore?: (goal: SavingsGoal) => void }) {
  return <section className="planning-card-grid">{goals.map((goal) => { const ratio = goal.targetMinor ? Math.min(100, Math.round(goal.currentMinor / goal.targetMinor * 100)) : 0; const recent = contributions.filter((item) => item.goalId === goal.id).slice(0, 3); return <article className={`planning-card goal-card ${inactive ? 'archived' : ''}`} key={goal.id}><div className="planning-card-head"><div><span className="eyebrow">{inactive ? goal.closedAt ? 'Closed' : 'Archived' : goal.status === 'completed' ? 'Finished' : 'In progress'}</span><h3>{goal.name}</h3></div><strong>{ratio}%</strong></div><div className="budget-amount-line"><strong>{formatMoney(goal.currentMinor, goal.currency)}</strong><span>of {formatMoney(goal.targetMinor, goal.currency)}</span></div><div className="progress planning-progress"><span style={{ width: `${ratio}%` }} /></div><div className="planning-meta"><span>{spaces.find((item) => item.id === goal.spaceId)?.name || 'Space'}</span><span>{goal.targetDate ? `Aim to finish by ${goal.targetDate}` : 'No deadline'}</span></div>{recent.length > 0 && <div className="mini-history">{recent.map((item) => <div key={item.id}><span>{item.contributionDate}</span><strong>{item.reversalOf ? '-' : ''}{formatMoney(item.amountMinor, item.currency)}</strong>{!inactive && item.status === 'posted' && !item.reversalOf && <button className="text-button danger" onClick={async () => { if (confirm('Undo this saved progress?')) { await reverseGoalContribution(item.id); await onLoad(); } }}>Undo</button>}</div>)}</div>}<div className="button-row">{inactive ? <button className="button secondary" disabled={busyId === goal.id} onClick={() => onRestore?.(goal)}>Restore goal</button> : <><button className="button primary" disabled={goal.status === 'completed'} onClick={() => onContribute?.(goal)}>Add progress</button><button className="button secondary" onClick={() => onEdit?.(goal)}>Edit</button><button className="text-button" disabled={busyId === goal.id} onClick={() => onClose?.(goal)}>Close</button><button className="text-button" disabled={busyId === goal.id} onClick={() => onArchive?.(goal)}>Archive</button><button className="text-button danger" disabled={busyId === goal.id} onClick={() => onDelete?.(goal)}>Delete</button></>}</div></article>; })}</section>;
}

function GoalForm({ goal, spaces, onSaved }: { goal: SavingsGoal | null; spaces: Space[]; onSaved: () => Promise<void> }) { const [name, setName] = useState(goal?.name || ''); const [spaceId, setSpaceId] = useState(goal?.spaceId || spaces[0]?.id || ''); const [target, setTarget] = useState(goal ? String(goal.targetMinor / 100) : ''); const [targetDate, setTargetDate] = useState(goal?.targetDate || ''); const [note, setNote] = useState(goal?.note || ''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { const targetMinor = toMinorUnits(target); if (targetMinor <= 0) throw new Error('Enter a target greater than BND 0.00.'); if (goal) await updateGoal({ goalId: goal.id, name, targetMinor, targetDate: targetDate || undefined, note }); else await createGoal({ name, spaceId, targetMinor, targetDate: targetDate || undefined, note }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } }; return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<label>Goal name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} /></label><div className="form-grid"><label>Space<select value={spaceId} onChange={(event) => setSpaceId(event.target.value)} disabled={Boolean(goal)}>{spaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Amount needed (BND)<input value={target} onChange={(event) => setTarget(event.target.value)} inputMode="decimal" required /></label><label className="span-2">Finish by<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label></div><label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} /></label><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Save goal'}</button></form>; }
function ContributionForm({ goal, onSaved }: { goal: SavingsGoal; onSaved: () => Promise<void> }) { const [amount, setAmount] = useState(''); const [date, setDate] = useState(today()); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { const amountMinor = toMinorUnits(amount); if (amountMinor <= 0) throw new Error('Enter an amount greater than BND 0.00.'); await recordGoalContribution({ goalId: goal.id, amountMinor, contributionDate: date, note }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } }; return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<div className="notice">This only updates your savings goal. It does not take money out of an account.</div><label>Amount (BND)<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required /></label><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} /></label><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Save progress'}</button></form>; }
