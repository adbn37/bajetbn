import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_TRANSACTION_CATEGORIES } from '../categories/defaultCategories';
import { listCustomCategories } from '../../repositories/categoryRepository';
import { createBudget, listAllBudgets, updateBudget } from '../../repositories/budgetRepository';
import { manageBudget } from '../../repositories/lifecycleRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type { Budget, BudgetPeriodType, Space, TransactionCategory } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

function today() { return new Date().toISOString().slice(0, 10); }
function monthRange(date = today()) { const [year, month] = date.split('-').map(Number); return { start: `${year}-${String(month).padStart(2, '0')}-01`, end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) }; }

export function BudgetsPage() {
  const { user, profile } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const [nextBudgets, nextSpaces, custom] = await Promise.all([listAllBudgets(user.uid), listSpaces(user.uid), listCustomCategories(user.uid)]);
      setBudgets(nextBudgets); setSpaces(nextSpaces.filter((item) => !item.archivedAt));
      setCategories([...DEFAULT_TRANSACTION_CATEGORIES.filter((item) => item.kind === 'expense'), ...custom.filter((item) => item.kind === 'expense')]);
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const active = useMemo(() => budgets.filter((item) => !item.archivedAt), [budgets]);
  const archived = useMemo(() => budgets.filter((item) => item.archivedAt), [budgets]);
  const totalLimit = active.reduce((sum, item) => sum + item.limitMinor, 0);
  const totalSpent = active.reduce((sum, item) => sum + item.spentMinor, 0);
  const overCount = active.filter((item) => item.spentMinor > item.limitMinor).length;
  const spaceMap = useMemo(() => new Map(spaces.map((item) => [item.id, item])), [spaces]);

  async function lifecycle(budget: Budget, action: 'archive' | 'restore' | 'delete') {
    const text = action === 'archive' ? `Archive ${budget.name}?\n\nIts past spending will stay in reports.` : action === 'delete' ? `Delete ${budget.name}?\n\nThis only works when no spending has used it. This cannot be undone.` : `Restore ${budget.name}?`;
    if (!confirm(text)) return;
    setBusyId(budget.id); setError('');
    try { await manageBudget(budget.id, action); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusyId(''); }
  }

  return <main className="page">
    <PageHeader eyebrow="Planning" title="Budgets" description="Set how much you plan to spend. Saved expenses update the matching budget automatically." action={<button className="button primary" onClick={() => { setEditing(null); setShowForm(true); }}>Add budget</button>} />
    {error && <div className="notice error">{error}</div>}
    <section className="summary-grid"><article className="summary-card featured"><span>Planned to spend</span><strong>{formatMoney(totalLimit, profile?.currency || 'BND')}</strong><small>Across current budgets</small></article><article className="summary-card"><span>Spent</span><strong>{formatMoney(totalSpent, profile?.currency || 'BND')}</strong><small>From saved expenses</small></article><article className="summary-card"><span>Left to spend</span><strong>{formatMoney(totalLimit - totalSpent, profile?.currency || 'BND')}</strong><small>May go below zero</small></article><article className="summary-card"><span>Over budget</span><strong>{overCount}</strong><small>Check these budgets</small></article></section>
    <section className="panel planning-panel"><div className="panel-heading"><div><span className="eyebrow">Current budgets</span><h2>{loading ? 'Loading…' : `${active.length} budget${active.length === 1 ? '' : 's'}`}</h2></div></div>{active.length ? <BudgetGrid budgets={active} spaceMap={spaceMap} busyId={busyId} onEdit={(budget) => { setEditing(budget); setShowForm(true); }} onArchive={(budget) => void lifecycle(budget, 'archive')} onDelete={(budget) => void lifecycle(budget, 'delete')} /> : !loading && <div className="mini-empty"><p>No active budgets yet.</p></div>}</section>
    {archived.length > 0 && <section className="panel archived-items-panel"><div className="panel-heading"><div><span className="eyebrow">Kept for past reports</span><h2>Archived budgets</h2></div><span className="type-badge">{archived.length}</span></div><BudgetGrid budgets={archived} spaceMap={spaceMap} busyId={busyId} archived onRestore={(budget) => void lifecycle(budget, 'restore')} /></section>}
    {showForm && <Modal title={editing ? 'Edit budget' : 'Add budget'} onClose={() => setShowForm(false)}><BudgetForm budget={editing} spaces={spaces} categories={categories} onSaved={async () => { setShowForm(false); await load(); }} /></Modal>}
  </main>;
}

function BudgetGrid({ budgets, spaceMap, busyId, archived = false, onEdit, onArchive, onDelete, onRestore }: { budgets: Budget[]; spaceMap: Map<string, Space>; busyId: string; archived?: boolean; onEdit?: (budget: Budget) => void; onArchive?: (budget: Budget) => void; onDelete?: (budget: Budget) => void; onRestore?: (budget: Budget) => void }) {
  return <div className="planning-card-grid">{budgets.map((budget) => { const ratio = budget.limitMinor > 0 ? Math.min(100, Math.round((budget.spentMinor / budget.limitMinor) * 100)) : 0; const over = budget.spentMinor > budget.limitMinor; return <article className={`planning-card ${over ? 'is-over' : ''} ${archived ? 'archived' : ''}`} key={budget.id}><div className="planning-card-head"><div><span className="eyebrow">{spaceMap.get(budget.spaceId)?.name || 'Space'}</span><h3>{budget.name}</h3></div><span className="type-badge">{archived ? 'Archived' : budget.periodType === 'monthly' ? 'Monthly' : 'Chosen dates'}</span></div><div className="budget-amount-line"><strong>{formatMoney(budget.spentMinor, budget.currency)}</strong><span>of {formatMoney(budget.limitMinor, budget.currency)}</span></div><div className="progress planning-progress"><span style={{ width: `${ratio}%` }} /></div><div className="planning-meta"><span>{budget.categoryName || 'All spending categories'}</span><span>{budget.startDate} → {budget.endDate}</span></div><div className="button-row">{archived ? <button className="button secondary" disabled={busyId === budget.id} onClick={() => onRestore?.(budget)}>Restore budget</button> : <><button className="button secondary" onClick={() => onEdit?.(budget)}>Edit</button><button className="text-button" disabled={busyId === budget.id} onClick={() => onArchive?.(budget)}>Archive</button><button className="text-button danger" disabled={busyId === budget.id} onClick={() => onDelete?.(budget)}>Delete</button></>}</div></article>; })}</div>;
}

function BudgetForm({ budget, spaces, categories, onSaved }: { budget: Budget | null; spaces: Space[]; categories: TransactionCategory[]; onSaved: () => Promise<void> }) {
  const range = monthRange(); const [name, setName] = useState(budget?.name || ''); const [spaceId, setSpaceId] = useState(budget?.spaceId || spaces[0]?.id || ''); const [categoryId, setCategoryId] = useState(budget?.categoryId || ''); const [periodType, setPeriodType] = useState<BudgetPeriodType>(budget?.periodType || 'monthly'); const [startDate, setStartDate] = useState(budget?.startDate || range.start); const [endDate, setEndDate] = useState(budget?.endDate || range.end); const [limit, setLimit] = useState(budget ? String(budget.limitMinor / 100) : ''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { const limitMinor = toMinorUnits(limit); if (limitMinor <= 0) throw new Error('Enter a budget greater than BND 0.00.'); if (!spaceId || !name.trim()) throw new Error('Enter a name and choose a Space.'); if (endDate < startDate) throw new Error('End date must be on or after the start date.'); const input = { name: name.trim(), categoryId: categoryId || undefined, periodType, startDate, endDate, limitMinor }; if (budget) await updateBudget({ budgetId: budget.id, ...input }); else await createBudget({ spaceId, ...input }); await onSaved(); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  const selectedSpace = spaces.find((item) => item.id === spaceId); const scopedCategories = categories.filter((item) => item.scope === 'both' || item.scope === (selectedSpace?.type === 'sme' ? 'business' : 'personal'));
  return <form className="form-stack" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<div className="form-grid"><label className="span-2">Budget name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Monthly groceries" maxLength={80} required /></label><label>Space<select value={spaceId} onChange={(event) => { setSpaceId(event.target.value); setCategoryId(''); }} disabled={Boolean(budget)}>{spaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">All spending categories</option>{scopedCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Budget type<select value={periodType} onChange={(event) => setPeriodType(event.target.value as BudgetPeriodType)}><option value="monthly">Monthly</option><option value="custom">Chosen dates</option></select></label><label>Amount ({selectedSpace?.currency || 'BND'})<input value={limit} onChange={(event) => setLimit(event.target.value)} inputMode="decimal" required /></label><label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label><label>End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label></div><button className="button primary full" disabled={busy}>{busy ? 'Saving…' : 'Save budget'}</button></form>;
}
