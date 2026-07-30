import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { listAccounts } from '../../repositories/accountRepository';
import { listSharedBillAssignments } from '../../repositories/collaborationRepository';
import { listCommitments } from '../../repositories/commitmentRepository';
import { listGoals } from '../../repositories/goalRepository';
import { listReminderHistory, recordReminder } from '../../repositories/reminderRepository';
import { listSpaces } from '../../repositories/spaceRepository';
import type {
  Account,
  Commitment,
  Language,
  ReminderHistory,
  ReminderItemType,
  SavingsGoal,
  SharedBillAssignment,
  Space,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';
import { localeForLanguage } from '../../services/i18n';

type ReminderState = 'late' | 'today' | 'soon' | 'later';

interface CalendarItem {
  id: string;
  itemId: string;
  itemType: ReminderItemType;
  title: string;
  date: string;
  state: ReminderState;
  spaceId: string;
  accountId?: string | null;
  amountMinor?: number;
  currency: string;
  route: string;
  detail: string;
}

const dayMilliseconds = 24 * 60 * 60 * 1000;

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromString(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function daysFromToday(date: string) {
  return Math.round((startOfDay(dateFromString(date)).getTime() - startOfDay(new Date()).getTime()) / dayMilliseconds);
}

function reminderState(date: string): ReminderState {
  const days = daysFromToday(date);
  if (days < 0) return 'late';
  if (days === 0) return 'today';
  if (days <= 7) return 'soon';
  return 'later';
}

function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function moveMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return monthValue(date);
}

function monthTitle(month: string, locale: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
}

function readableDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(dateFromString(date));
}

function calendarDates(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - leading + 1;
    if (day < 1 || day > daysInMonth) return null;
    return `${month}-${String(day).padStart(2, '0')}`;
  });
}

function itemTypeLabel(type: ReminderItemType) {
  if (type === 'bill') return 'Bill';
  if (type === 'instalment') return 'Instalment';
  if (type === 'goal') return 'Goal';
  return 'Shared bill';
}

function stateLabel(state: ReminderState) {
  if (state === 'late') return 'Late';
  if (state === 'today') return 'Due today';
  if (state === 'soon') return 'Coming soon';
  return 'Later';
}

function buildReminderMessage(item: CalendarItem, locale: string, language: Language) {
  const amount = typeof item.amountMinor === 'number' ? formatMoney(item.amountMinor, item.currency) : '';
  if (language === 'ms') {
    return `Peringatan: ${item.title} perlu dibayar pada ${readableDate(item.date, locale)}.${amount ? ` Jumlah: ${amount}.` : ''} Sila semak BajetBN.`;
  }
  return `Reminder: ${item.title} is due on ${readableDate(item.date, locale)}.${amount ? ` Amount: ${amount}.` : ''} Please check BajetBN.`;
}

function ItemList({ items, spaces, accounts, onRemind, onWhatsApp, busyId, locale, showWhatsApp }: {
  items: CalendarItem[];
  spaces: Map<string, Space>;
  accounts: Map<string, Account>;
  onRemind: (item: CalendarItem) => Promise<void>;
  onWhatsApp: (item: CalendarItem) => Promise<void>;
  busyId: string;
  locale: string;
  showWhatsApp: boolean;
}) {
  if (!items.length) return <div className="calendar-list-empty">Nothing here.</div>;

  return <div className="calendar-item-list">
    {items.map((item) => {
      const space = spaces.get(item.spaceId);
      const account = item.accountId ? accounts.get(item.accountId) : null;
      return <article className={`calendar-item state-${item.state}`} key={item.id}>
        <div className="calendar-item-date"><strong>{dateFromString(item.date).getDate()}</strong><span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(dateFromString(item.date))}</span></div>
        <div className="calendar-item-main">
          <div className="calendar-item-heading"><div><span className="type-badge">{itemTypeLabel(item.itemType)}</span><strong>{item.title}</strong></div>{typeof item.amountMinor === 'number' && <b>{formatMoney(item.amountMinor, item.currency)}</b>}</div>
          <p>{item.detail}</p>
          <small>{space?.name || 'Personal'}{account ? ` · ${account.name}` : ''} · {stateLabel(item.state)}</small>
        </div>
        <div className="calendar-item-actions">
          <Link className="button secondary" to={item.route}>Open</Link>
          <button className="button secondary" disabled={busyId === item.id} onClick={() => void onRemind(item)}>Mark as reminded</button>
          {showWhatsApp && <button className="button secondary" disabled={busyId === item.id || !space?.headWhatsapp} onClick={() => void onWhatsApp(item)} title={space?.headWhatsapp ? 'Open WhatsApp with a ready message' : 'Add a WhatsApp number in Sharing first'}>WhatsApp</button>}
        </div>
      </article>;
    })}
  </div>;
}

export function CalendarPage() {
  const { user, profile } = useAuth();
  const { language, whatsappRemindersEnabled } = usePreferences();
  const locale = localeForLanguage(language);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [sharedBills, setSharedBills] = useState<SharedBillAssignment[]>([]);
  const [history, setHistory] = useState<ReminderHistory[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(monthValue());
  const [selectedDate, setSelectedDate] = useState(localDateString());
  const [selectedSpace, setSelectedSpace] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedState, setSelectedState] = useState<ReminderState | ''>('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadHistory(uid: string) {
    try {
      setHistory(await listReminderHistory(uid));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    Promise.all([
      listSpaces(user.uid),
      listAccounts(user.uid),
      listCommitments(user.uid),
      listGoals(user.uid),
      listReminderHistory(user.uid),
    ]).then(async ([nextSpaces, nextAccounts, nextCommitments, nextGoals, nextHistory]) => {
      const activeSpaces = nextSpaces.filter((item) => !item.archivedAt);
      const assignmentGroups = await Promise.all(activeSpaces.map((space) => listSharedBillAssignments(space.id).catch(() => [] as SharedBillAssignment[])));
      setSpaces(activeSpaces);
      setAccounts(nextAccounts);
      setCommitments(nextCommitments);
      setGoals(nextGoals);
      setHistory(nextHistory);
      setSharedBills(assignmentGroups.flat().filter((item) => item.memberUid === user.uid));
    }).catch((nextError) => setError(getErrorMessage(nextError))).finally(() => setLoading(false));
  }, [user]);

  const currency = profile?.currency || 'BND';
  const spaceMap = useMemo(() => new Map(spaces.map((item) => [item.id, item])), [spaces]);
  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);

  const items = useMemo<CalendarItem[]>(() => {
    const next: CalendarItem[] = [];

    const sharedCommitmentIds = new Set(sharedBills.filter((item) => !['paid', 'confirmed'].includes(item.status)).map((item) => item.commitmentId));

    commitments.filter((item) => item.status === 'active' && (item.nextDueDate || item.startDate) && !sharedCommitmentIds.has(item.id)).forEach((item) => {
      const date = item.nextDueDate || item.startDate;
      const amount = item.type === 'instalment'
        ? Math.min(item.amountMinor, Math.max(0, (item.totalAmountMinor || item.amountMinor) - item.amountPaidMinor))
        : item.amountMinor;
      next.push({
        id: `commitment:${item.id}`,
        itemId: item.id,
        itemType: item.type,
        title: item.name,
        date,
        state: reminderState(date),
        spaceId: item.spaceId,
        accountId: item.accountId,
        amountMinor: amount,
        currency: item.currency || currency,
        route: '/bills',
        detail: item.payee ? `Pay ${item.payee}` : item.type === 'bill' ? 'Bill payment' : 'Instalment payment',
      });
    });

    goals.filter((item) => item.status === 'active' && item.targetDate).forEach((item) => {
      const date = item.targetDate as string;
      next.push({
        id: `goal:${item.id}`,
        itemId: item.id,
        itemType: 'goal',
        title: item.name,
        date,
        state: reminderState(date),
        spaceId: item.spaceId,
        amountMinor: Math.max(0, item.targetMinor - item.currentMinor),
        currency: item.currency || currency,
        route: '/goals',
        detail: 'Amount still needed for this goal',
      });
    });

    sharedBills.filter((item) => !['paid', 'confirmed'].includes(item.status)).forEach((item) => {
      next.push({
        id: `shared:${item.id}`,
        itemId: item.id,
        itemType: 'shared_bill',
        title: item.commitmentName,
        date: item.dueDate,
        state: reminderState(item.dueDate),
        spaceId: item.spaceId,
        amountMinor: item.outstandingMinor ?? Math.max(0, item.assignedMinor - (item.settledMinor || 0)),
        currency: item.currency || currency,
        route: '/sharing',
        detail: 'Your share of a shared bill',
      });
    });

    return next.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [commitments, goals, sharedBills, currency]);

  const filteredItems = useMemo(() => items.filter((item) => (
    (!selectedSpace || item.spaceId === selectedSpace)
    && (!selectedAccount || item.accountId === selectedAccount)
    && (!selectedState || item.state === selectedState)
  )), [items, selectedSpace, selectedAccount, selectedState]);

  const lateItems = filteredItems.filter((item) => item.state === 'late');
  const todayItems = filteredItems.filter((item) => item.state === 'today');
  const soonItems = filteredItems.filter((item) => item.state === 'soon');
  const selectedDateItems = filteredItems.filter((item) => item.date === selectedDate);
  const monthItems = filteredItems.filter((item) => item.date.startsWith(selectedMonth));
  const itemCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    monthItems.forEach((item) => counts.set(item.date, (counts.get(item.date) || 0) + 1));
    return counts;
  }, [monthItems]);

  async function markReminded(item: CalendarItem) {
    if (!user) return;
    setBusyId(item.id);
    setError('');
    setSuccess('');
    try {
      await recordReminder({
        uid: user.uid,
        itemType: item.itemType,
        itemId: item.itemId,
        itemName: item.title,
        spaceId: item.spaceId,
        dueDate: item.date,
        action: 'marked_reminded',
        message: buildReminderMessage(item, locale, language),
      });
      await loadHistory(user.uid);
      setSuccess(`Reminder saved for ${item.title}.`);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusyId('');
    }
  }

  async function openWhatsApp(item: CalendarItem) {
    if (!user) return;
    const phone = spaceMap.get(item.spaceId)?.headWhatsapp || '';
    if (!phone) {
      setError('Add a WhatsApp number for this Space on the Sharing page first.');
      return;
    }
    const message = buildReminderMessage(item, locale, language);
    const digits = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setBusyId(item.id);
    setError('');
    try {
      await recordReminder({
        uid: user.uid,
        itemType: item.itemType,
        itemId: item.itemId,
        itemName: item.title,
        spaceId: item.spaceId,
        dueDate: item.date,
        action: 'whatsapp_opened',
        message,
        phone,
      });
      await loadHistory(user.uid);
      setSuccess('WhatsApp opened with a ready reminder message.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusyId('');
    }
  }

  if (loading) return <main className="page"><div className="panel">Loading your calendar…</div></main>;

  return <main className="page calendar-page">
    <PageHeader eyebrow="Plan ahead" title="Calendar & reminders" description="See what is late, due today, or coming soon." />
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}

    <section className="calendar-filter-panel">
      <label>Month<input type="month" value={selectedMonth} onChange={(event) => { const nextMonth = event.target.value || monthValue(); setSelectedMonth(nextMonth); setSelectedDate(`${nextMonth}-01`); }} /></label>
      <label>Space<select value={selectedSpace} onChange={(event) => setSelectedSpace(event.target.value)}><option value="">All Spaces</option>{spaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Account<select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}><option value="">All accounts</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Show<select value={selectedState} onChange={(event) => setSelectedState(event.target.value as ReminderState | '')}><option value="">Everything</option><option value="late">Late</option><option value="today">Due today</option><option value="soon">Coming soon</option><option value="later">Later</option></select></label>
      <button className="button secondary" onClick={() => { setSelectedMonth(monthValue()); setSelectedDate(localDateString()); setSelectedSpace(''); setSelectedAccount(''); setSelectedState(''); }}>Today</button>
    </section>

    <section className="summary-grid calendar-summary-grid">
      <article className={`summary-card ${lateItems.length ? 'calendar-summary-late' : ''}`}><span>Late</span><strong>{lateItems.length}</strong><small>Needs your attention</small></article>
      <article className="summary-card"><span>Due today</span><strong>{todayItems.length}</strong><small>For today</small></article>
      <article className="summary-card"><span>Coming soon</span><strong>{soonItems.length}</strong><small>Next 7 days</small></article>
      <article className="summary-card featured"><span>This month</span><strong>{monthItems.length}</strong><small>Items on your calendar</small></article>
    </section>

    <section className="reminder-section-grid">
      <article className="panel"><div className="panel-heading"><div><h2>Late</h2><p>These dates have passed.</p></div><span className="type-badge">{lateItems.length}</span></div><ItemList items={lateItems.slice(0, 5)} spaces={spaceMap} accounts={accountMap} onRemind={markReminded} onWhatsApp={openWhatsApp} busyId={busyId} locale={locale} showWhatsApp={whatsappRemindersEnabled} /></article>
      <article className="panel"><div className="panel-heading"><div><h2>Due today</h2><p>Things to handle today.</p></div><span className="type-badge">{todayItems.length}</span></div><ItemList items={todayItems.slice(0, 5)} spaces={spaceMap} accounts={accountMap} onRemind={markReminded} onWhatsApp={openWhatsApp} busyId={busyId} locale={locale} showWhatsApp={whatsappRemindersEnabled} /></article>
      <article className="panel"><div className="panel-heading"><div><h2>Coming soon</h2><p>Due in the next 7 days.</p></div><span className="type-badge">{soonItems.length}</span></div><ItemList items={soonItems.slice(0, 5)} spaces={spaceMap} accounts={accountMap} onRemind={markReminded} onWhatsApp={openWhatsApp} busyId={busyId} locale={locale} showWhatsApp={whatsappRemindersEnabled} /></article>
    </section>

    <section className="calendar-workspace">
      <article className="panel month-calendar-panel">
        <div className="calendar-month-heading"><button className="icon-button" onClick={() => { const next = moveMonth(selectedMonth, -1); setSelectedMonth(next); setSelectedDate(`${next}-01`); }} aria-label="Previous month">‹</button><h2>{monthTitle(selectedMonth, locale)}</h2><button className="icon-button" onClick={() => { const next = moveMonth(selectedMonth, 1); setSelectedMonth(next); setSelectedDate(`${next}-01`); }} aria-label="Next month">›</button></div>
        <div className="calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{calendarDates(selectedMonth).map((date, index) => date ? <button key={date} className={`${date === selectedDate ? 'selected' : ''} ${date === localDateString() ? 'today' : ''}`} onClick={() => setSelectedDate(date)}><span>{dateFromString(date).getDate()}</span>{Boolean(itemCountByDate.get(date)) && <b>{itemCountByDate.get(date)}</b>}</button> : <span className="calendar-blank" key={`blank-${index}`} />)}</div>
      </article>

      <article className="panel selected-date-panel">
        <div className="panel-heading"><div><span className="eyebrow">Selected date</span><h2>{readableDate(selectedDate, locale)}</h2></div><span className="type-badge">{selectedDateItems.length}</span></div>
        {selectedDateItems.length ? <ItemList items={selectedDateItems} spaces={spaceMap} accounts={accountMap} onRemind={markReminded} onWhatsApp={openWhatsApp} busyId={busyId} locale={locale} showWhatsApp={whatsappRemindersEnabled} /> : <EmptyState title="Nothing planned" description="There are no bills, instalments, shared bills, or goal dates on this day." />}
      </article>
    </section>

    <section className="panel reminder-history-panel">
      <div className="panel-heading"><div><h2>Reminder history</h2><p>A simple record of reminders you marked or opened in WhatsApp.</p></div></div>
      {history.length ? <div className="reminder-history-list">{history.slice(0, 20).map((item) => <article key={item.id}><span className="activity-dot" /><div><strong>{item.itemName}</strong><small>{item.action === 'whatsapp_opened' ? 'WhatsApp reminder opened' : 'Marked as reminded'}{item.dueDate ? ` · Due ${readableDate(item.dueDate, locale)}` : ''}</small></div><time>{item.createdAt ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(item.createdAt.toDate()) : 'Just now'}</time></article>)}</div> : <EmptyState title="No reminder history yet" description="Use Mark as reminded or WhatsApp and it will appear here." />}
    </section>
  </main>;
}
