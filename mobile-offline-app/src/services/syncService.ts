import { postChecklist } from './apiClient';
import {
  clearSyncedItems,
  getPendingItemsReadyToSync,
  updateQueueItemStatus,
} from '../storage/queueStorage';

const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 60_000;

let syncInProgress = false;

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
}

const getBackoffDelayMs = (retryCount: number): number => {
  const exponential = BASE_RETRY_DELAY_MS * 2 ** Math.max(0, retryCount - 1);
  return Math.min(exponential, MAX_RETRY_DELAY_MS);
};

export const syncPendingQueue = async (): Promise<SyncResult> => {
  if (syncInProgress) {
    return { syncedCount: 0, failedCount: 0 };
  }

  syncInProgress = true;
  let syncedCount = 0;
  let failedCount = 0;

  try {
    const pendingItems = await getPendingItemsReadyToSync();
    for (const item of pendingItems) {
      await updateQueueItemStatus(item.id, {
        status: 'syncing',
        lastError: null,
      });

      try {
        await postChecklist(item.payload);
        await updateQueueItemStatus(item.id, {
          status: 'synced',
          syncedAt: new Date().toISOString(),
          nextRetryAt: null,
          lastError: null,
        });
        syncedCount += 1;
      } catch (error) {
        const nextRetryCount = item.retryCount + 1;
        const retryDelay = getBackoffDelayMs(nextRetryCount);
        const nextRetryAt = new Date(Date.now() + retryDelay).toISOString();

        await updateQueueItemStatus(item.id, {
          status: 'error',
          retryCount: nextRetryCount,
          nextRetryAt,
          lastError: error instanceof Error ? error.message : String(error),
        });

        failedCount += 1;
      }
    }

    await clearSyncedItems();
    return { syncedCount, failedCount };
  } finally {
    syncInProgress = false;
  }
};
