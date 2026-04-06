export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface ChecklistFormPayload {
  name: string;
  observation: string;
  checklistOk: boolean;
}

export interface SyncQueueItem {
  id: string;
  payload: ChecklistFormPayload;
  createdAt: string;
  status: SyncStatus;
  retryCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  syncedAt: string | null;
}
