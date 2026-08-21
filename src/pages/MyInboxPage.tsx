import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeMyInbox,
  type MyInboxItem,
} from '../repositories/myInboxRepository';
import { getErrorMessage } from '../utils/errors';
import { formatMoney } from '../utils/money';

type InboxFilter = 'all' | 'action' | 'waiting' | 'money';

const DISMISSED_STORAGE_KEY = 'bajetbn:my-inbox-dismissed:v1';

function loadDismissed(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DISMISSED_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string[]> : {};
  } catch {
    return {};
  }
}

function badge(item: MyInboxItem): string {
  if (item.kind === 'approval_review') return 'Needs review';
  if (item.kind === 'approval_request') return 'Waiting';
  if (item.kind === 'shared_bill') {
    if (item.state === 'needs_action') return 'Due now';
    if (item.state === 'due_soon') return 'Due soon';
    return 'Money';
  }
  if (item.kind === 'mention') return 'Mention';
  if (item.kind === 'task') return 'Task';
  if (item.kind === 'contribution') return 'Contribution';
  if (item.automationRule === 'budget_threshold') return 'Budget';
  if (item.automationRule === 'low_fund') return 'Low fund';
  if (item.automationRule === 'overdue_task') return 'Task overdue';
  if (item.automationRule === 'low_stock') return 'Low stock';
  if (item.automationRule === 'seller_payout_due') return 'Seller payout';
  if (item.automationRule === 'contribution_due') return 'Contribution';
  return 'Reminder';
}

function needsAction(item: MyInboxItem): boolean {
  if (item.kind === 'approval_request') return false;
  if (item.kind === 'approval_review') return true;
  if (item.kind === 'mention' || item.kind === 'task' || item.kind === 'contribution') return true;
  if (item.kind === 'reminder') return true;
  return item.state === 'needs_action' || item.state === 'due_soon';
}

function isMoneyItem(item: MyInboxItem): boolean {
  return item.kind === 'shared_bill'
    || item.kind === 'contribution'
    || item.automationRule === 'budget_threshold'
    || item.automationRule === 'low_fund'
    || item.automationRule === 'seller_payout_due';
}

function itemMatches(filter: InboxFilter, item: MyInboxItem): boolean {
  if (filter === 'all') return true;
  if (filter === 'action') return needsAction(item);
  if (filter === 'waiting') return item.kind === 'approval_request';
  if (filter === 'money') return isMoneyItem(item);
  return true;
}

function amountLabel(item: MyInboxItem): string {
  if (item.amountMinor == null || !item.currency) return '';
  return formatMoney(item.amountMinor, item.currency);
}

export function MyInboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MyInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [dismissedByUser, setDismissedByUser] = useState<Record<string, string[]>>(loadDismissed);

  useEffect(() => {
    if (!user) return undefined;

    return subscribeMyInbox(
      user.uid,
      (nextItems) => {
        setItems(nextItems);
        setLoading(false);
        setError('');
      },
      (nextError) => {
        setError(getErrorMessage(nextError));
        setLoading(false);
      },
    );
  }, [user]);

  const dismissedIds = useMemo(
    () => new Set(user ? dismissedByUser[user.uid] || [] : []),
    [dismissedByUser, user],
  );

  const visibleItems = useMemo(
    () => items.filter((item) => !item.dismissible || !dismissedIds.has(item.id)),
    [dismissedIds, items],
  );

  const filteredItems = useMemo(
    () => visibleItems.filter((item) => itemMatches(filter, item)),
    [filter, visibleItems],
  );

  const actionCount = useMemo(
    () => visibleItems.filter(needsAction).length,
    [visibleItems],
  );

  const waiting = useMemo(
    () => visibleItems.filter((item) => item.kind === 'approval_request').length,
    [visibleItems],
  );

  const moneyCount = useMemo(
    () => visibleItems.filter(isMoneyItem).length,
    [visibleItems],
  );

  function dismiss(item: MyInboxItem) {
    if (!user || !item.dismissible) return;

    setDismissedByUser((current) => {
      const currentIds = current[user.uid] || [];
      const nextIds = Array.from(new Set([...currentIds, item.id])).slice(-500);
      const next = { ...current, [user.uid]: nextIds };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  }

  return <main className="page my-inbox-page needs-attention-page">
    <PageHeader
      eyebrow="Cross-Space action queue"
      title="Needs Attention"
      description="One place for decisions, responsibilities and alerts that currently need you across your Spaces."
    />

    <section className="summary-grid my-inbox-summary">
      <article className="summary-card featured">
        <span>Needs action</span>
        <strong>{actionCount}</strong>
        <small>Decisions, due responsibilities and active alerts</small>
      </article>
      <article className="summary-card">
        <span>Waiting</span>
        <strong>{waiting}</strong>
        <small>Your requests waiting for another member to decide</small>
      </article>
      <article className="summary-card">
        <span>Money</span>
        <strong>{moneyCount}</strong>
        <small>Bills, contributions, budget, fund and payout attention</small>
      </article>
    </section>

    <section className="panel my-inbox-controls">
      <div>
        <span className="eyebrow">Actionable only</span>
        <h2>What needs your attention</h2>
        <p>
          This is not another Activity or Notifications feed. Completing the source record removes the item automatically.
        </p>
      </div>

      <div className="segmented-control planning-filter my-inbox-filters" aria-label="Needs Attention filter">
        <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
        <button type="button" className={filter === 'action' ? 'active' : ''} onClick={() => setFilter('action')}>Needs action</button>
        <button type="button" className={filter === 'waiting' ? 'active' : ''} onClick={() => setFilter('waiting')}>Waiting</button>
        <button type="button" className={filter === 'money' ? 'active' : ''} onClick={() => setFilter('money')}>Money</button>
      </div>
    </section>

    {error && <div className="notice error">{error}</div>}

    {loading
      ? <div className="loading-panel">Loading Needs Attention...</div>
      : filteredItems.length === 0
        ? <EmptyState
            title={filter === 'all' ? 'Nothing needs you right now' : 'No matching attention items'}
            description={filter === 'all'
              ? 'Pending decisions, assigned responsibilities and active Space alerts will appear here when action is needed.'
              : 'Choose another filter or return when a new responsibility arrives.'}
          />
        : <section className="panel my-inbox-list">
            {filteredItems.map((item) => {
              const money = amountLabel(item);

              return <article className={'my-inbox-row state-' + item.state} key={item.id}>
                <div className="my-inbox-row-main">
                  <div className="badge-row">
                    <span className="type-badge">{badge(item)}</span>
                    <span className="my-inbox-space">{item.spaceName}</span>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>

                  <div className="my-inbox-meta">
                    {money && <strong>{money}</strong>}
                    {item.dueDate && <span>Due {item.dueDate}</span>}
                  </div>
                </div>

                <div className="my-inbox-actions">
                  <button
                    type="button"
                    className="button primary compact"
                    onClick={() => navigate(item.targetPath)}
                  >
                    Open
                  </button>

                  {item.dismissible && <button
                    type="button"
                    className="text-button"
                    onClick={() => dismiss(item)}
                  >
                    Dismiss
                  </button>}
                </div>
              </article>;
            })}
          </section>}

    <section className="notice my-inbox-note">
      <strong>One source of truth.</strong>{' '}
      Needs Attention only points to the real record. Approval decisions stay in Approvals,
      bill completion stays in Bills, and financial actions remain explicit and manual.
      It never posts a transfer, expense or seller payout for you.
    </section>
  </main>;
}
