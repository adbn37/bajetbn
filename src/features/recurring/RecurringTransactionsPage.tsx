import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { PaymentMethodField } from '../../components/PaymentMethodField';
import { suggestedPaymentMethod } from '../../config/bruneiMoneyOptions';
import { useAuth } from '../../contexts/AuthContext';
import {
  DEFAULT_TRANSACTION_CATEGORIES,
  categoryApplies,
  categoryIconGlyph,
} from '../categories/defaultCategories';
import { listAccounts } from '../../repositories/accountRepository';
import { listCustomCategories } from '../../repositories/categoryRepository';
import {
  createRecurringTransactionTemplate,
  listRecurringTransactionTemplates,
  manageRecurringTransactionTemplate,
  postDueRecurringTransaction,
  updateRecurringTransactionTemplate,
} from '../../repositories/recurringTransactionRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type {
  Account,
  CategoryScope,
  PaymentMethodCode,
  RecurringTransactionFrequency,
  RecurringTransactionStatus,
  RecurringTransactionTemplate,
  RecurringTransactionType,
  Space,
  TransactionCategory,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

const frequencyLabels: Record<RecurringTransactionFrequency, string> = {
  weekly: 'Every week',
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  yearly: 'Every year',
};

const statusLabels: Record<RecurringTransactionStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  needs_attention: 'Needs attention',
  stopped: 'Stopped',
  completed: 'Completed',
};

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function readableDate(value?: string | null) {
  if (!value) return 'No next date';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-BN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
}

function spaceScope(space?: Space): Exclude<CategoryScope, 'both'> {
  return space?.type === 'sme' ? 'business' : 'personal';
}

function CategoryChoice({ category, selected, onClick }: { category: TransactionCategory; selected: boolean; onClick: () => void }) {
  return <button type="button" className={`category-option ${selected ? 'selected' : ''}`} onClick={onClick}>
    <span className={`category-icon category-${category.color}`}>{categoryIconGlyph(category.icon)}</span>
    <span>{category.name}</span>
    {!category.isSystem && <small>Custom</small>}
  </button>;
}

interface TemplateFormValues {
  templateId?: string;
  name: string;
  type: RecurringTransactionType;
  accountId: string;
  spaceId: string;
  amountMinor: number;
  categoryId: string;
  counterparty?: string;
  note?: string;
  paymentMethod?: PaymentMethodCode;
  paymentMethodLabel?: string;
  frequency: RecurringTransactionFrequency;
  nextRunDate: string;
  endDate?: string;
}

function RecurringTemplateForm({ template, accounts, spaces, categories, timezone, onClose, onSaved }: {
  template: RecurringTransactionTemplate | null;
  accounts: Account[];
  spaces: Space[];
  categories: TransactionCategory[];
  timezone: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(template?.name || '');
  const [type, setType] = useState<RecurringTransactionType>(template?.type || 'expense');
  const [spaceId, setSpaceId] = useState(template?.spaceId || spaces[0]?.id || '');
  const selectedSpace = spaces.find((space) => space.id === spaceId);
  const compatibleAccounts = accounts.filter((account) => !selectedSpace || account.currency === selectedSpace.currency);
  const [accountId, setAccountId] = useState(template?.accountId || compatibleAccounts[0]?.id || '');
  const [amount, setAmount] = useState(template ? (template.amountMinor / 100).toFixed(2) : '');
  const [categoryId, setCategoryId] = useState(template?.categoryId || '');
  const [counterparty, setCounterparty] = useState(template?.counterparty || '');
  const [note, setNote] = useState(template?.note || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>(template?.paymentMethod || suggestedPaymentMethod(accounts.find((account) => account.id === (template?.accountId || accountId))));
  const [paymentMethodCustom, setPaymentMethodCustom] = useState(template?.paymentMethod === 'other' ? template.paymentMethodLabel || '' : '');
  const [frequency, setFrequency] = useState<RecurringTransactionFrequency>(template?.frequency || 'monthly');
  const [nextRunDate, setNextRunDate] = useState(template?.nextRunDate || todayInTimezone(timezone));
  const [endDate, setEndDate] = useState(template?.endDate || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const scope = spaceScope(selectedSpace);
  const categoryOptions = categories.filter((category) => categoryApplies(category, type, scope));
  const selectedCategory = categoryOptions.find((category) => category.id === categoryId);

  useEffect(() => {
    if (!compatibleAccounts.some((account) => account.id === accountId)) setAccountId(compatibleAccounts[0]?.id || '');
  }, [accountId, compatibleAccounts]);

  useEffect(() => {
    if (!template) { setPaymentMethod(suggestedPaymentMethod(accounts.find((account) => account.id === accountId))); setPaymentMethodCustom(''); }
  }, [accountId, accounts, template]);

  useEffect(() => {
    if (!categoryOptions.some((category) => category.id === categoryId)) setCategoryId(categoryOptions[0]?.id || '');
  }, [categoryId, categoryOptions]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const amountMinor = toMinorUnits(amount);
      if (amountMinor <= 0) throw new Error('Enter an amount greater than BND 0.00.');
      if (!name.trim()) throw new Error('Add a name for this recurring money.');
      if (!spaceId || !accountId) throw new Error('Choose a Space and Account.');
      if (!selectedCategory) throw new Error('Choose a category.');
      if (!nextRunDate) throw new Error('Choose the next date.');
      if (endDate && endDate < nextRunDate) throw new Error('The end date must be on or after the next date.');
      const values: TemplateFormValues = {
        templateId: template?.id,
        name: name.trim(),
        type,
        accountId,
        spaceId,
        amountMinor,
        categoryId: selectedCategory.id,
        counterparty: counterparty.trim(),
        note: note.trim(),
        paymentMethod,
        paymentMethodLabel: paymentMethod === 'other' ? paymentMethodCustom.trim() : undefined,
        frequency,
        nextRunDate,
        endDate: endDate || undefined,
      };
      if (template) await updateRecurringTransactionTemplate({ ...values, templateId: template.id });
      else await createRecurringTransactionTemplate(values);
      await onSaved();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return <Modal title={template ? 'Edit future recurring money' : 'Add recurring money'} onClose={onClose}>
    <form className="recurring-form" onSubmit={submit}>
      {error && <div className="notice error">{error}</div>}
      {template && <div className="info-banner"><strong>Future dates only</strong><span>Changes here do not alter money activity that was already saved.</span></div>}
      <div className="segmented-control transaction-type-picker" role="group" aria-label="Recurring money type">
        {(['expense', 'income'] as const).map((value) => <button type="button" key={value} className={type === value ? 'active' : ''} onClick={() => setType(value)}>{value === 'income' ? 'Money in' : 'Money out'}</button>)}
      </div>
      <div className="form-grid">
        <label className="span-2">Name<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder={type === 'income' ? 'Example: Monthly salary' : 'Example: Monthly subscription'} /></label>
        <label>Space<select required value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>{spaces.map((space) => <option key={space.id} value={space.id}>{space.name} · {space.type === 'sme' ? 'Business' : 'Personal'}</option>)}</select></label>
        <label>Account<select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{compatibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatMoney(account.ledgerBalanceMinor, account.currency)}</option>)}</select></label>
        <label className="span-2 amount-field">Amount ({selectedSpace?.currency || 'BND'})<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
      </div>
      <fieldset className="category-picker"><legend>Category</legend><div className="category-option-grid">
        {categoryOptions.map((category) => <CategoryChoice key={category.id} category={category} selected={categoryId === category.id} onClick={() => setCategoryId(category.id)} />)}
      </div></fieldset>
      <div className="form-grid">
        <label>{type === 'income' ? 'Source or customer' : 'Shop or person paid'}<input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} maxLength={120} placeholder="Optional" /></label>
        <PaymentMethodField value={paymentMethod} customLabel={paymentMethodCustom} onChange={(value, custom) => { setPaymentMethod(value); setPaymentMethodCustom(custom); }} />
        <label>Repeats<select value={frequency} onChange={(event) => setFrequency(event.target.value as RecurringTransactionFrequency)}><option value="weekly">Every week</option><option value="monthly">Every month</option><option value="quarterly">Every 3 months</option><option value="yearly">Every year</option></select></label>
        <label>Next date<input required type="date" min={todayInTimezone(timezone)} value={nextRunDate} onChange={(event) => setNextRunDate(event.target.value)} /></label>
        <label>End date<input type="date" min={nextRunDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /><small>Leave blank to keep repeating.</small></label>
        <label className="span-2">Note<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Optional details" /></label>
      </div>
      <div className="info-banner"><strong>Automatic and duplicate-safe</strong><span>BajetBN posts one transaction on each due date. Repeated scheduler runs cannot create the same occurrence twice.</span></div>
      {compatibleAccounts.length === 0 && <div className="notice error">No active account uses {selectedSpace?.currency || 'this currency'}.</div>}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy || !compatibleAccounts.length || !selectedCategory}>{busy ? 'Saving…' : template ? 'Save future changes' : 'Start recurring money'}</button></div>
    </form>
  </Modal>;
}

function ResumeModal({ template, timezone, onClose, onResume }: {
  template: RecurringTransactionTemplate;
  timezone: string;
  onClose: () => void;
  onResume: (date: string) => Promise<void>;
}) {
  const [date, setDate] = useState(template.nextRunDate && template.nextRunDate >= todayInTimezone(timezone) ? template.nextRunDate : todayInTimezone(timezone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try { await onResume(date); }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  };
  return <Modal title={`Resume ${template.name}`} onClose={onClose}><form onSubmit={submit} className="recurring-form">
    {error && <div className="notice error">{error}</div>}
    <p>Choose the next date. BajetBN will not create missed transactions from while this was paused.</p>
    <label>Next date<input required type="date" min={todayInTimezone(timezone)} value={date} onChange={(event) => setDate(event.target.value)} /></label>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Resuming…' : 'Resume recurring money'}</button></div>
  </form></Modal>;
}

export function RecurringTransactionsPage() {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<RecurringTransactionTemplate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>(DEFAULT_TRANSACTION_CATEGORIES);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringTransactionTemplate | null>(null);
  const [resuming, setResuming] = useState<RecurringTransactionTemplate | null>(null);
  const [dialog, setDialog] = useState<ActionConfirmState<RecurringTransactionTemplate> | null>(null);
  const [dialogAction, setDialogAction] = useState<'pause' | 'skip' | 'stop' | 'run' | null>(null);
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const timezone = profile?.timezone || 'Asia/Brunei';
  const today = todayInTimezone(timezone);

  async function load() {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const [nextTemplates, nextAccounts, nextSpaces, customCategories] = await Promise.all([
        listRecurringTransactionTemplates(user.uid),
        listAccounts(user.uid),
        listSpaces(user.uid),
        listCustomCategories(user.uid),
      ]);
      setTemplates(nextTemplates);
      setAccounts(nextAccounts);
      setSpaces(nextSpaces.filter((space) => !space.archivedAt));
      setCategories([...DEFAULT_TRANSACTION_CATEGORIES, ...customCategories]);
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [user]);

  const visible = templates.filter((item) => ['active', 'paused', 'needs_attention'].includes(item.status));
  const endedCount = templates.filter((item) => ['stopped', 'completed'].includes(item.status)).length;
  const activeCount = visible.filter((item) => item.status === 'active').length;
  const attentionCount = visible.filter((item) => item.status === 'needs_attention').length;
  const dueSoon = visible.filter((item) => item.status === 'active' && item.nextRunDate && item.nextRunDate <= today).length;
  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);
  const spaceMap = useMemo(() => new Map(spaces.map((item) => [item.id, item])), [spaces]);

  function ask(template: RecurringTransactionTemplate, action: 'pause' | 'skip' | 'stop' | 'run') {
    setError(''); setSuccess(''); setDialogAction(action);
    const states = {
      pause: { title: `Pause ${template.name}?`, description: 'No automatic transactions will be posted while this is paused.', note: 'You can resume it later and choose a new next date.', confirmLabel: 'Pause recurring money' },
      skip: { title: `Skip ${readableDate(template.nextRunDate)}?`, description: 'BajetBN will record this occurrence as skipped and move to the following date.', note: 'No account balance will change for the skipped date.', confirmLabel: 'Skip next occurrence' },
      stop: { title: `Stop ${template.name}?`, description: 'This recurring money will move to Stopped recurring money.', note: 'Transactions already saved will remain unchanged. You can restart it later.', confirmLabel: 'Stop recurring money', tone: 'danger' as const },
      run: { title: `Post ${template.name} now?`, description: `BajetBN will post the due occurrence for ${readableDate(template.nextRunDate)}.`, note: 'Duplicate protection ensures the same due date cannot be posted twice.', confirmLabel: 'Post due transaction' },
    };
    setDialog({ payload: template, ...states[action] });
  }

  async function runDialogAction() {
    if (!dialog || !dialogAction) return;
    const template = dialog.payload;
    setBusyId(template.id); setError(''); setSuccess('');
    try {
      if (dialogAction === 'run') await postDueRecurringTransaction(template.id);
      else await manageRecurringTransactionTemplate({ templateId: template.id, action: dialogAction });
      setSuccess(dialogAction === 'run' ? `${template.name} was posted.` : `${template.name} was updated.`);
      setDialog(null); setDialogAction(null); await load();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusyId(''); }
  }

  if (loading) return <main className="page"><div className="panel">Loading recurring money…</div></main>;

  return <main className="page recurring-page">
    <PageHeader eyebrow="Automatic money activity" title="Recurring money" description="Set up salary, allowance, rent income, subscriptions, and other repeating income or expenses."
      action={<div className="header-actions"><Link className="button secondary archive-button" to="/recurring/stopped">Stopped <span>{endedCount}</span></Link><button className="button primary" disabled={!accounts.length || !spaces.length} onClick={() => { setEditing(null); setShowForm(true); }}>+ Add recurring money</button></div>} />
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}
    <section className="summary-grid recurring-summary-grid">
      <article className="summary-card featured"><span>Active</span><strong>{activeCount}</strong><small>Posting automatically</small></article>
      <article className="summary-card"><span>Due now</span><strong>{dueSoon}</strong><small>Ready to post</small></article>
      <article className={attentionCount ? 'summary-card warning-card' : 'summary-card'}><span>Needs attention</span><strong>{attentionCount}</strong><small>Account or Space needs checking</small></article>
      <article className="summary-card"><span>Stopped</span><strong>{endedCount}</strong><small>Kept on a separate page</small></article>
    </section>
    <div className="info-banner"><strong>How it works</strong><span>On each due date, BajetBN saves a normal money activity record and safely updates the selected Account. You can pause, skip, edit future dates, or stop at any time.</span></div>
    {!accounts.length && <div className="notice">Add an active Account before creating recurring money.</div>}
    {!spaces.length && <div className="notice">Add or restore a Space before creating recurring money.</div>}
    {visible.length === 0 ? <EmptyState title="No recurring money yet" description="Add repeating salary, allowance, rent income, subscriptions, or regular expenses." action={accounts.length && spaces.length ? <button className="button primary" onClick={() => setShowForm(true)}>Add recurring money</button> : undefined} /> : <section className="recurring-card-grid">
      {visible.map((template) => {
        const account = accountMap.get(template.accountId);
        const space = spaceMap.get(template.spaceId);
        const due = template.status === 'active' && Boolean(template.nextRunDate && template.nextRunDate <= today);
        return <article className={`recurring-card status-${template.status}`} key={template.id}>
          <div className="recurring-card-heading"><div className={`category-icon category-${template.categoryColor}`}>{categoryIconGlyph(template.categoryIcon)}</div><div><span className="eyebrow">{template.type === 'income' ? 'Money in' : 'Money out'}</span><h2>{template.name}</h2></div><span className={`status-badge ${template.status}`}>{statusLabels[template.status]}</span></div>
          <strong className={template.type === 'income' ? 'money-positive recurring-amount' : 'money-negative recurring-amount'}>{template.type === 'income' ? '+' : '−'}{formatMoney(template.amountMinor, template.currency)}</strong>
          <dl className="recurring-details"><div><dt>Repeats</dt><dd>{frequencyLabels[template.frequency]}</dd></div><div><dt>Next date</dt><dd>{readableDate(template.nextRunDate)}</dd></div><div><dt>Space</dt><dd>{space?.name || 'Unavailable Space'}</dd></div><div><dt>Account</dt><dd>{account?.name || 'Unavailable Account'}</dd></div><div><dt>Category</dt><dd>{template.category}</dd></div><div><dt>Posted</dt><dd>{template.generatedCount} time{template.generatedCount === 1 ? '' : 's'}</dd></div></dl>
          {template.lastError && <div className="notice error compact-notice">{template.lastError}</div>}
          <div className="card-actions recurring-actions"><button className="button secondary" onClick={() => { setEditing(template); setShowForm(true); }}>Edit future</button>{due && <button className="button primary" onClick={() => ask(template, 'run')}>Post due now</button>}{template.status === 'active' && <button className="button secondary" onClick={() => ask(template, 'pause')}>Pause</button>}{template.status === 'active' && template.nextRunDate && <button className="button secondary" onClick={() => ask(template, 'skip')}>Skip next</button>}{['paused', 'needs_attention'].includes(template.status) && <button className="button primary" onClick={() => setResuming(template)}>Resume</button>}<button className="text-button danger" onClick={() => ask(template, 'stop')}>Stop</button></div>
        </article>;
      })}
    </section>}
    {showForm && <RecurringTemplateForm template={editing} accounts={accounts} spaces={spaces} categories={categories} timezone={timezone} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={async () => { setShowForm(false); setEditing(null); setSuccess('Recurring money saved.'); await load(); }} />}
    {resuming && <ResumeModal template={resuming} timezone={timezone} onClose={() => setResuming(null)} onResume={async (date) => { await manageRecurringTransactionTemplate({ templateId: resuming.id, action: 'resume', nextRunDate: date }); setResuming(null); setSuccess(`${resuming.name} resumed.`); await load(); }} />}
    {dialog && <ActionConfirmModal state={dialog} busy={busyId === dialog.payload.id} error={error} onClose={() => { setDialog(null); setDialogAction(null); setError(''); }} onConfirm={() => void runDialogAction()} />}
  </main>;
}
