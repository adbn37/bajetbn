import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  listOfflineCommands,
  onOfflineQueueChanged,
  removeOfflineCommand,
  resetOfflineCommand,
  type OfflineFinancialCommand,
} from '../services/offlineQueue';
import { syncQueuedTransactions, type OfflineSyncSummary } from '../repositories/transactionRepository';

interface OfflineSyncContextValue {
  online: boolean;
  supported: boolean;
  commands: OfflineFinancialCommand[];
  pendingCount: number;
  needsAttentionCount: number;
  syncing: boolean;
  lastSummary: OfflineSyncSummary | null;
  lastCompletedAt: number;
  refresh: () => Promise<void>;
  syncNow: () => Promise<OfflineSyncSummary | null>;
  retryCommand: (id: string) => Promise<void>;
  removeCommand: (id: string) => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextValue | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [commands, setCommands] = useState<OfflineFinancialCommand[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSummary, setLastSummary] = useState<OfflineSyncSummary | null>(null);
  const [lastCompletedAt, setLastCompletedAt] = useState(0);
  const syncPromise = useRef<Promise<OfflineSyncSummary | null> | null>(null);
  const supported = typeof indexedDB !== 'undefined';

  const refresh = useCallback(async () => {
    if (!user || !supported) {
      setCommands([]);
      return;
    }
    try {
      setCommands(await listOfflineCommands(user.uid));
    } catch (error) {
      console.error('[BajetBN offline sync] Unable to read the local queue.', error);
      setCommands([]);
    }
  }, [supported, user]);

  const syncNow = useCallback(async (): Promise<OfflineSyncSummary | null> => {
    if (!user || !supported || !navigator.onLine) return null;
    if (syncPromise.current) return syncPromise.current;

    const task = (async () => {
      setSyncing(true);
      try {
        const summary = await syncQueuedTransactions(user.uid);
        setLastSummary(summary);
        if (summary.posted > 0) setLastCompletedAt(Date.now());
        await refresh();
        return summary;
      } finally {
        setSyncing(false);
        syncPromise.current = null;
      }
    })();

    syncPromise.current = task;
    return task;
  }, [refresh, supported, user]);

  const retryCommand = useCallback(async (id: string) => {
    await resetOfflineCommand(id);
    await refresh();
    if (navigator.onLine) await syncNow();
  }, [refresh, syncNow]);

  const removeCommand = useCallback(async (id: string) => {
    await removeOfflineCommand(id);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

  useEffect(() => {
    void refresh();
    return onOfflineQueueChanged(() => { void refresh(); });
  }, [refresh]);

  useEffect(() => {
    if (online && user) void syncNow();
  }, [online, syncNow, user]);

  useEffect(() => {
    if (!user || !online) return;
    const interval = window.setInterval(() => { void syncNow(); }, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [online, syncNow, user]);

  const value = useMemo<OfflineSyncContextValue>(() => ({
    online,
    supported,
    commands,
    pendingCount: commands.filter((item) => item.status !== 'needs_attention').length,
    needsAttentionCount: commands.filter((item) => item.status === 'needs_attention').length,
    syncing,
    lastSummary,
    lastCompletedAt,
    refresh,
    syncNow,
    retryCommand,
    removeCommand,
  }), [commands, lastCompletedAt, lastSummary, online, refresh, removeCommand, retryCommand, supported, syncNow, syncing]);

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync(): OfflineSyncContextValue {
  const context = useContext(OfflineSyncContext);
  if (!context) throw new Error('useOfflineSync must be used inside OfflineSyncProvider.');
  return context;
}
