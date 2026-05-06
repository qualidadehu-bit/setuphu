const CACHE_PREFIX = 'huuel-shell-';
const CACHE_VERSION = 'v2';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/favicon.ico', OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Nunca cachear APIs ou domínios externos.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  // Navegacao: network-first com fallback para offline shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Assets: cache-first com atualizacao em background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});
const DEFAULT_TAG = 'notificacao-huuel';

const safeParsePushData = (event) => {
  if (!event.data) return {};
  try {
    return event.data.json() || {};
  } catch {
    try {
      return { message: event.data.text() };
    } catch {
      return {};
    }
  }
};

const toAbsoluteUrl = (url) => {
  try {
    return new URL(url || '/', self.location.origin).toString();
  } catch {
    return new URL('/', self.location.origin).toString();
  }
};

self.addEventListener('push', (event) => {
  const data = safeParsePushData(event);
  const url = toAbsoluteUrl(data.url || '/');
  const options = {
    body: data.message || '',
    tag: data.tag || DEFAULT_TAG,
    requireInteraction: Boolean(data.requireInteraction),
    data: {
      url,
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Notificação', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = toAbsoluteUrl(event.notification.data?.url || '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = toAbsoluteUrl(client.url);
        if (clientUrl === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
      return undefined;
    }),
  );
});
