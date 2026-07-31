import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { listCommitments } from '../repositories/commitmentRepository';
import {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../repositories/collaborationRepository';
import type { Commitment, UserNotification } from '../types/models';
import { getErrorMessage } from '../utils/errors';

function defaultTarget(item: UserNotification) {
  if (item.targetPath) return item.targetPath;
  if (item.spaceId) return `/spaces/${item.spaceId}`;
  if (item.type.includes('goal')) return '/goals';
  if (item.type.includes('bill') || item.type.includes('payment')) return '/bills';
  if (item.type.includes('invitation')) return '/spaces';
  return '/';
}

function formatWhen(item: UserNotification) {
  const date = item.createdAt?.toDate?.();
  if (!date) return 'Recently';
  return new Intl.DateTimeFormat('en-BN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Brunei',
  }).format(date);
}

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const unread = useMemo(() => items.filter((item) => !item.readAt), [items]);
  const billAlerts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return commitments.filter((item) => item.status === 'active' && item.nextDueDate).map((item) => {
      const due = new Date(`${item.nextDueDate}T00:00:00`);
      const days = Math.round((due.getTime() - today.getTime()) / 86400000);
      return { item, days };
    }).filter(({ item, days }) => days < 0 || days <= Math.max(0, item.reminderDays || 3));
  }, [commitments]);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [nextItems, nextCommitments] = await Promise.all([listUserNotifications(user.uid), listCommitments(user.uid)]);
      setItems(nextItems);
      setCommitments(nextCommitments);
    }
    catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [user]);

  async function openItem(item: UserNotification) {
    try {
      if (!item.readAt) await markNotificationRead(item.id);
      navigate(defaultTarget(item));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }

  async function markEverythingRead() {
    setBusy(true);
    setError('');
    try {
      await markAllNotificationsRead(unread.map((item) => item.id));
      await load();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  return <main className="page notifications-page">
    <PageHeader
      eyebrow="Updates"
      title="Notifications"
      description="See invitations, payments, bills, goals, and Space updates in one place."
      action={unread.length > 0 ? <button className="button secondary" disabled={busy} onClick={() => void markEverythingRead()}>{busy ? 'Saving…' : 'Mark all as read'}</button> : undefined}
    />
    {error && <div className="notice error">{error}</div>}
    <section className="summary-grid notification-summary">
      <article className="summary-card featured"><span>New</span><strong>{unread.length}</strong><small>Updates not opened yet</small></article>
      <article className="summary-card"><span>All updates</span><strong>{items.length}</strong><small>Your recent BajetBN activity</small></article>
    </section>
    {!loading && billAlerts.length > 0 && <section className="panel notification-attention-panel"><div className="panel-heading"><div><span className="eyebrow">Needs attention</span><h2>Bills coming up</h2></div><span className="type-badge">{billAlerts.length}</span></div><div className="notification-list">{billAlerts.map(({ item, days }) => <button className={`notification-row ${days < 0 ? 'overdue' : 'unread'}`} key={`bill-${item.id}`} onClick={() => navigate(`/bills?commitmentId=${item.id}`)}><span className="notification-dot" aria-hidden="true"/><span className="notification-copy"><strong>{days < 0 ? 'Bill is late' : days === 0 ? 'Bill is due today' : 'Bill is coming soon'}</strong><span>{item.name} · {item.nextDueDate}</span><small>{days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} late` : days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`}</small></span><span className="notification-action">Open bill →</span></button>)}</div></section>}
    {loading ? <div className="loading-panel">Loading notifications…</div> : items.length === 0 && billAlerts.length === 0 ? <EmptyState title="No notifications yet" description="Invitations, payments, bills, and Space updates will appear here." /> : items.length > 0 ? <section className="notification-list panel">
      {items.map((item) => <button key={item.id} className={`notification-row ${item.readAt ? 'read' : 'unread'}`} onClick={() => void openItem(item)}>
        <span className="notification-dot" aria-hidden="true" />
        <span className="notification-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{formatWhen(item)}</small></span>
        <span className="notification-action">{item.actionLabel || 'Open'} →</span>
      </button>)}
    </section> : null}
  </main>;
}
