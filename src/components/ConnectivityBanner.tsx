import { Link } from 'react-router-dom';
import { useOfflineSync } from '../contexts/OfflineSyncContext';

export function ConnectivityBanner() {
  const { online, pendingCount, needsAttentionCount, syncing } = useOfflineSync();

  if (online && pendingCount === 0 && needsAttentionCount === 0 && !syncing) return null;

  if (!online) {
    return (
      <div className="connectivity-banner" role="status" aria-live="polite">
        <strong>You are offline.</strong>
        <span>Cached money information may be older. New money activity can wait safely on this device.</span>
        {(pendingCount + needsAttentionCount) > 0 && <Link to="/offline-sync">{pendingCount + needsAttentionCount} saved {pendingCount + needsAttentionCount === 1 ? 'entry' : 'entries'}</Link>}
      </div>
    );
  }

  if (needsAttentionCount > 0) {
    return (
      <div className="connectivity-banner attention" role="status" aria-live="polite">
        <strong>{needsAttentionCount} offline {needsAttentionCount === 1 ? 'entry needs' : 'entries need'} attention.</strong>
        <span>Check the Account, Space, or category before retrying.</span>
        <Link to="/offline-sync">Open Offline & sync</Link>
      </div>
    );
  }

  return (
    <div className="connectivity-banner syncing" role="status" aria-live="polite">
      <strong>{syncing ? 'Syncing saved money activity…' : `${pendingCount} ${pendingCount === 1 ? 'entry is' : 'entries are'} waiting to sync.`}</strong>
      <span>BajetBN uses duplicate protection when the connection returns.</span>
      <Link to="/offline-sync">View status</Link>
    </div>
  );
}
