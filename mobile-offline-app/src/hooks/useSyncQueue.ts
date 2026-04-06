import { useCallback, useEffect, useMemo, useState } from 'react';

import { addToQueue, getQueue } from '../storage/queueStorage';
import { syncPendingQueue } from '../services/syncService';
import { ChecklistFormPayload, SyncQueueItem } from '../types/checklist';

interface UseSyncQueueOptions {
  isOnline: boolean;
}

export const useSyncQueue = ({ isOnline }: UseSyncQueueOptions) => {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshQueue = useCallback(async () => {
    const items = await getQueue();
    setQueue(items);
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setLastError(null);
    try {
      const result = await syncPendingQueue();
      if (result.failedCount > 0) {
        setLastError(`${result.failedCount} item(ns) com falha de sincronizacao.`);
      }
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      await refreshQueue();
      setIsSyncing(false);
    }
  }, [isOnline, refreshQueue]);

  const saveFormOfflineFirst = useCallback(
    async (payload: ChecklistFormPayload) => {
      await addToQueue(payload);
      await refreshQueue();
      if (isOnline) {
        await syncNow();
      }
    },
    [isOnline, refreshQueue, syncNow],
  );

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    if (isOnline) {
      void syncNow();
    }
  }, [isOnline, syncNow]);

  const pendingCount = useMemo(
    () => queue.filter((item) => item.status !== 'synced').length,
    [queue],
  );

  return {
    queue,
    pendingCount,
    isSyncing,
    lastError,
    refreshQueue,
    syncNow,
    saveFormOfflineFirst,
  };
};
