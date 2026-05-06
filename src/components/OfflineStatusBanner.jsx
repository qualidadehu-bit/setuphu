import { useEffect, useState } from 'react';
import { apiClient } from '@/api/apiClient';

const initialState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastError: null,
};

export default function OfflineStatusBanner() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(apiClient.offline.getState());
    const unsubscribe = apiClient.offline.subscribe((next) => setState(next));
    return () => {
      unsubscribe();
    };
  }, []);

  if (state.isOnline && state.pendingCount === 0 && !state.lastError) {
    return null;
  }

  const message = !state.isOnline
    ? 'Voce esta offline. Os dados serao salvos localmente e enviados depois.'
    : state.isSyncing
      ? `Sincronizando ${state.pendingCount} item(ns) pendente(s)...`
      : state.pendingCount > 0
        ? `${state.pendingCount} item(ns) pendente(s) aguardando envio.`
        : state.lastError || '';

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,640px)] -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg">
      <p className="font-semibold">Status de conectividade</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
