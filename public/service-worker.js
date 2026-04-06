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
