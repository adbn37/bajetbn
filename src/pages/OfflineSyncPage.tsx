import { useMemo, useState } from 'react';
import { ActionConfirmModal, type ActionConfirmState } from '../components/ActionConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineSync } from '../contexts/OfflineSyncContext';
import type { OfflineFinancialCommand } from '../services/offlineQueue';
import { formatMoney } from '../utils/money';

const typeLabels = {
  income: 'Money in',
  expense: 'Money out',
  transfer: 'Move money',
} as const;

function formatTime(value?: string | null): string {
  if (!value) return 'Not tried yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-BN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Brunei',
  }).format(date);
}

export function OfflineSyncPage() {
  const { profile } = useAuth();
  const {
    online,
    supported,
    commands,
    pendingCount,
    needsAttentionCount,
    syncing,
    lastSummary,
    syncNow,
    retryCommand,
    removeCommand,
  } = useOfflineSync();
  const [removeDialog, setRemoveDialog] = useState<ActionConfirmState<OfflineFinancialCommand> | null>(null);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const ordered = useMemo(
    () => [...commands].sort((a, b) => {
      if (a.status === 'needs_attention' && b.status !== 'needs_attention') return -1;
      if (a.status !== 'needs_attention' && b.status === 'needs_attention') return 1;
      return a.createdAt.localeCompare(b.createdAt);
    }),
    [commands],
  );

  async function retry(id: string) {
    setBusyId(id);
    setError('');
    try {
      await retryCommand(id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The entry could not be retried.');
    } finally {
      setBusyId('');
    }
  }

  async function remove() {
    if (!removeDialog) return;
    setBusyId(removeDialog.payload.id);
    setError('');
    try {
      await removeCommand(removeDialog.payload.id);
      setRemoveDialog(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The saved entry could not be removed.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <main className="page offline-sync-page">
      <PageHeader
        eyebrow="Saved on this device"
        title="Offline & sync"
        description="Money activity saved without internet stays on this device until BajetBN safely sends it."
        action={<button className="button primary" disabled={!online || syncing || pendingCount === 0} onClick={() => void syncNow()}>{syncing ? 'Syncing…' : 'Sync now'}</button>}
      />

      {error && <div className="notice error">{error}</div>}
      {!supported && <div className="notice error">This browser does not support offline saving. Use a current version of Chrome, Edge, Safari, or Firefox.</div>}
      {!online && <div className="notice warning"><strong>You are offline.</strong> Entries will stay on this device until internet returns.</div>}
      {lastSummary && online && !syncing && <div className="notice success">Last check: {lastSummary.posted} synced, {lastSummary.needsAttention} need attention, {lastSummary.waiting} still waiting.</div>}

      <section className="offline-sync-summary">
        <div><span>Waiting</span><strong>{pendingCount}</strong><small>Will retry automatically</small></div>
        <div><span>Needs attention</span><strong>{needsAttentionCount}</strong><small>Check the Account, Space, or category</small></div>
        <div><span>Connection</span><strong>{online ? 'Online' : 'Offline'}</strong><small>{online ? 'Safe to sync now' : 'Stored only on this device'}</small></div>
      </section>

      <div className="info-banner offline-sync-explanation">
        <strong>Duplicate-safe</strong>
        <span>Every saved entry keeps one private duplicate-protection key. Retrying cannot post the same money activity twice.</span>
      </div>

      {ordered.length === 0 ? (
        <EmptyState title="Nothing waiting to sync" description="New money activity is sent immediately when you are online. Offline entries will appear here." />
      ) : (
        <section className="offline-command-list">
          {ordered.map((command) => {
            const payload = command.payload;
            return <article className={`offline-command-card status-${command.status}`} key={command.id}>
              <div className="offline-command-head">
                <div>
                  <span>{typeLabels[payload.type]}</span>
                  <h2>{payload.category || typeLabels[payload.type]}</h2>
                </div>
                <strong className={payload.type === 'income' ? 'money-positive' : payload.type === 'expense' ? 'money-negative' : ''}>{formatMoney(payload.amountMinor, payload.currency || profile?.currency || 'BND')}</strong>
                <span className={`status-badge ${command.status}`}>{command.status === 'needs_attention' ? 'Needs attention' : command.status === 'syncing' ? 'Syncing' : 'Waiting'}</span>
              </div>
              <dl className="offline-command-details">
                <div><dt>Date</dt><dd>{payload.transactionDate}</dd></div>
                <div><dt>Saved on device</dt><dd>{formatTime(command.createdAt)}</dd></div>
                <div><dt>Attempts</dt><dd>{command.attempts}</dd></div>
                <div><dt>Last try</dt><dd>{formatTime(command.lastAttemptAt)}</dd></div>
              </dl>
              {command.lastError && <div className="notice warning compact-notice"><strong>Why it stopped</strong><span>{command.lastError}</span></div>}
              <div className="offline-command-actions">
                {command.status === 'needs_attention' && <button className="button secondary" disabled={!online || busyId === command.id} onClick={() => void retry(command.id)}>{busyId === command.id ? 'Retrying…' : 'Retry'}</button>}
                <button className="text-button danger" disabled={busyId === command.id} onClick={() => setRemoveDialog({
                  payload: command,
                  title: 'Remove this unsynced entry?',
                  description: command.attempts === 0
                    ? 'This removes the copy saved on this device. It has not been sent to BajetBN yet.'
                    : 'This stops BajetBN from retrying this saved entry. A previous attempt may already have reached the server.',
                  note: command.attempts === 0
                    ? 'Add the money activity again later if you still need it.'
                    : 'Check Money activity after reconnecting before you add it again.',
                  confirmLabel: 'Remove saved entry',
                  tone: 'danger',
                })}>Remove</button>
              </div>
            </article>;
          })}
        </section>
      )}

      <div className="notice offline-sync-boundary"><strong>Use offline storage only on a private or trusted device.</strong> Before account deletion on a shared device, sync or remove waiting entries and clear BajetBN site data in the browser.</div>
      <div className="notice offline-sync-boundary"><strong>Online still required for other actions.</strong> Undo, bill payments, goal contributions, shared payments, and fund contributions are not queued offline.</div>

      {removeDialog && <ActionConfirmModal state={removeDialog} busy={busyId === removeDialog.payload.id} error={error} onClose={() => { setRemoveDialog(null); setError(''); }} onConfirm={() => void remove()} />}
    </main>
  );
}
