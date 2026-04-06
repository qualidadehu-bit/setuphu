import AsyncStorage from '@react-native-async-storage/async-storage';

import { ChecklistFormPayload, SyncQueueItem, SyncStatus } from '../types/checklist';

const STORAGE_KEY = '@offline_checklist_queue:v1';

const safeParseQueue = (rawValue: string | null): SyncQueueItem[] => {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getQueue = async (): Promise<SyncQueueItem[]> => {
  const rawValue = await AsyncStorage.getItem(STORAGE_KEY);
  return safeParseQueue(rawValue);
};

export const saveQueue = async (queue: SyncQueueItem[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

const createQueueId = (): string => {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const addToQueue = async (payload: ChecklistFormPayload): Promise<SyncQueueItem> => {
  const queue = await getQueue();
  const item: SyncQueueItem = {
    id: createQueueId(),
    payload,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
    nextRetryAt: null,
    lastError: null,
    syncedAt: null,
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
};

export const updateQueueItemStatus = async (
  itemId: string,
  updates: Partial<Pick<SyncQueueItem, 'status' | 'retryCount' | 'nextRetryAt' | 'lastError' | 'syncedAt'>>,
): Promise<void> => {
  const queue = await getQueue();
  const nextQueue = queue.map((item) => {
    if (item.id !== itemId) return item;
    return { ...item, ...updates };
  });
  await saveQueue(nextQueue);
};

export const removeQueueItems = async (itemIds: string[]): Promise<void> => {
  if (!itemIds.length) return;
  const queue = await getQueue();
  const nextQueue = queue.filter((item) => !itemIds.includes(item.id));
  await saveQueue(nextQueue);
};

export const clearSyncedItems = async (): Promise<void> => {
  const queue = await getQueue();
  const nextQueue = queue.filter((item) => item.status !== 'synced');
  await saveQueue(nextQueue);
};

export const getPendingItemsReadyToSync = async (now = new Date()): Promise<SyncQueueItem[]> => {
  const queue = await getQueue();
  const nowTime = now.getTime();
  return queue.filter((item) => {
    if (item.status === 'syncing' || item.status === 'synced') return false;
    if (!item.nextRetryAt) return true;
    return new Date(item.nextRetryAt).getTime() <= nowTime;
  });
};

export const countItemsByStatus = (queue: SyncQueueItem[], status: SyncStatus): number => {
  return queue.filter((item) => item.status === status).length;
};
