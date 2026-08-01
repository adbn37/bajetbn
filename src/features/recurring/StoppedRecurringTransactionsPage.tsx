import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { categoryIconGlyph } from '../categories/defaultCategories';
import { listRecurringTransactionTemplates, manageRecurringTransactionTemplate } from '../../repositories/recurringTransactionRepository';
import type { RecurringTransactionTemplate } from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function RestartModal({ template, timezone, onClose, onRestart }: { template: RecurringTransactionTemplate; timezone: string; onClose: () => void; onRestart: (date: string) => Promise<void> }) {
  const [date, setDate] = useState(todayInTimezone(timezone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await onRestart(date); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <Modal title={`Restart ${template.name}`} onClose={onClose}><form className="recurring-form" onSubmit={submit}>{error && <div className="notice error">{error}</div>}<p>Choose the first new date. Previous transactions stay unchanged.</p><label>Next date<input required type="date" min={todayInTimezone(timezone)} value={date} onChange={(event) => setDate(event.target.value)} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Restarting…' : 'Restart recurring money'}</button></div></form></Modal>;
}

export function StoppedRecurringTransactionsPage() {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<RecurringTransactionTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [restarting, setRestarting] = useState<RecurringTransactionTemplate | null>(null);
  const [dialog, setDialog] = useState<ActionConfirmState<RecurringTransactionTemplate> | null>(null);
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timezone = profile?.timezone || 'Asia/Brunei';

  async function load() {
    if (!user) return;
    setLoading(true); setError('');
    try { setTemplates((await listRecurringTransactionTemplates(user.uid)).filter((item) => ['stopped', 'completed'].includes(item.status))); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [user]);
  const visible = templates.filter((item) => !search.trim() || [item.name, item.category, item.counterparty].some((value) => value?.toLowerCase().includes(search.trim().toLowerCase())));

  async function deleteUnused() {
    if (!dialog) return;
    setBusyId(dialog.payload.id); setError('');
    try { await manageRecurringTransactionTemplate({ templateId: dialog.payload.id, action: 'delete' }); setDialog(null); await load(); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusyId(''); }
  }

  return <main className="page recurring-page">
    <PageHeader eyebrow="Recurring money" title="Stopped recurring money" description="Restart old templates or permanently delete templates that were never used." action={<Link className="button secondary" to="/recurring">Back to recurring money</Link>} />
    {error && <div className="notice error">{error}</div>}
    <section className="transaction-toolbar"><input className="transaction-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stopped recurring money…" /></section>
    {loading ? <div className="loading-panel">Loading stopped recurring money…</div> : visible.length === 0 ? <EmptyState title="No stopped recurring money" description="Stopped and completed templates will appear here." /> : <section className="recurring-card-grid">
      {visible.map((template) => <article className={`recurring-card status-${template.status}`} key={template.id}><div className="recurring-card-heading"><div className={`category-icon category-${template.categoryColor}`}>{categoryIconGlyph(template.categoryIcon)}</div><div><span className="eyebrow">{template.status === 'completed' ? 'Completed' : 'Stopped'}</span><h2>{template.name}</h2></div></div><strong className={template.type === 'income' ? 'money-positive recurring-amount' : 'money-negative recurring-amount'}>{template.type === 'income' ? '+' : '−'}{formatMoney(template.amountMinor, template.currency)}</strong><p>{template.category} · Posted {template.generatedCount} time{template.generatedCount === 1 ? '' : 's'}</p><div className="card-actions"><button className="button primary" onClick={() => setRestarting(template)}>Restart</button>{template.generatedCount === 0 && <button className="button danger" onClick={() => setDialog({ payload: template, title: `Delete ${template.name} permanently?`, description: 'This template has never posted a transaction, so it can be removed safely.', note: 'This cannot be undone.', confirmLabel: 'Delete permanently', tone: 'danger' })}>Delete</button>}</div></article>)}
    </section>}
    {restarting && <RestartModal template={restarting} timezone={timezone} onClose={() => setRestarting(null)} onRestart={async (date) => { await manageRecurringTransactionTemplate({ templateId: restarting.id, action: 'restart', nextRunDate: date }); setRestarting(null); await load(); }} />}
    {dialog && <ActionConfirmModal state={dialog} busy={busyId === dialog.payload.id} error={error} onClose={() => { setDialog(null); setError(''); }} onConfirm={() => void deleteUnused()} />}
  </main>;
}
