const DB_NAME = 'huuel-offline-db';
const STORE_NAME = 'request_queue';
const DB_VERSION = 1;
const MAX_RETRY_DELAY_MS = 60_000;
const BASE_RETRY_DELAY_MS = 3_000;

let dbPromise = null;
let syncInProgress = false;
let sendRequestFn = null;
let onlineListenerRegistered = false;

const listeners = new Set();
const state = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastError: null,
};

const emit = () => {
  listeners.forEach((listener) => {
    try {
      listener({ ...state });
    } catch {
      // ignore observer errors
    }
  });
};

const updateState = (partial) => {
  Object.assign(state, partial);
  emit();
};

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir IndexedDB.'));
  });
  return dbPromise;
};

const runTransaction = async (mode, handler) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = handler(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error('Falha na transação IndexedDB.'));
    tx.onabort = () => reject(tx.error || new Error('Transação IndexedDB abortada.'));
  });
};

const getAllItems = async () => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Falha ao listar fila offline.'));
  });
};

const countItems = async () => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();
    request.onsuccess = () => resolve(Number(request.result || 0));
    request.onerror = () => reject(request.error || new Error('Falha ao contar itens da fila.'));
  });
};

const updateItem = async (item) =>
  runTransaction('readwrite', (store) => {
    store.put(item);
  });

const deleteItem = async (id) =>
  runTransaction('readwrite', (store) => {
    store.delete(id);
  });

const getRetryDelay = (attempts) => {
  const attempt = Math.max(1, Number(attempts || 1));
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
};

const isNetworkError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('offline')
  );
};

export const getOfflineQueueState = () => ({ ...state });

export const subscribeOfflineQueue = (listener) => {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
};

export const refreshOfflineQueueCount = async () => {
  try {
    const pendingCount = await countItems();
    updateState({ pendingCount });
    return pendingCount;
  } catch (error) {
    updateState({ lastError: error instanceof Error ? error.message : String(error) });
    return 0;
  }
};

export const enqueueOfflineRequest = async ({ path, method = 'POST', body }) => {
  const payload = {
    path,
    method,
    body: body ?? null,
    createdAt: Date.now(),
    attempts: 0,
    nextRetryAt: Date.now(),
    lastError: null,
  };
  await runTransaction('readwrite', (store) => {
    store.add(payload);
  });
  await refreshOfflineQueueCount();
};

export const flushOfflineQueue = async () => {
  if (!sendRequestFn || syncInProgress) {
    return { syncedCount: 0, failedCount: 0 };
  }
  syncInProgress = true;
  updateState({ isSyncing: true, isOnline: navigator.onLine, lastError: null });

  let syncedCount = 0;
  let failedCount = 0;

  try {
    const now = Date.now();
    const items = await getAllItems();
    const eligible = items
      .filter((item) => Number(item.nextRetryAt || 0) <= now)
      .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

    for (const item of eligible) {
      try {
        await sendRequestFn(item);
        await deleteItem(item.id);
        syncedCount += 1;
      } catch (error) {
        failedCount += 1;
        if (isNetworkError(error)) {
          const attempts = Number(item.attempts || 0) + 1;
          const delay = getRetryDelay(attempts);
          await updateItem({
            ...item,
            attempts,
            nextRetryAt: Date.now() + delay,
            lastError: error instanceof Error ? error.message : String(error),
          });
          updateState({
            lastError: 'Sem conexão. Dados serão reenviados quando a internet voltar.',
          });
          break;
        }
        // Erro de payload/servidor: mantém com backoff para nova tentativa.
        const attempts = Number(item.attempts || 0) + 1;
        const delay = getRetryDelay(attempts);
        await updateItem({
          ...item,
          attempts,
          nextRetryAt: Date.now() + delay,
          lastError: error instanceof Error ? error.message : String(error),
        });
        updateState({
          lastError: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    syncInProgress = false;
    await refreshOfflineQueueCount();
    updateState({ isSyncing: false, isOnline: navigator.onLine });
  }

  return { syncedCount, failedCount };
};

export const initOfflineQueue = async (sendRequest) => {
  sendRequestFn = sendRequest;
  await refreshOfflineQueueCount();

  if (!onlineListenerRegistered && typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      updateState({ isOnline: true });
      void flushOfflineQueue();
    });
    window.addEventListener('offline', () => {
      updateState({ isOnline: false });
    });
    onlineListenerRegistered = true;
  }
};
