/**
 * Gerenciador de notificações push para o sistema HUUEL
 */

const runtimeImportMeta = /** @type {any} */ (import.meta);
const PUBLIC_VAPID_KEY = String(runtimeImportMeta?.env?.VITE_PUBLIC_VAPID_KEY || '').trim();

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers não suportados');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('Service Worker registrado com sucesso');
    return registration;
  } catch (error) {
    console.error('Erro ao registrar Service Worker:', error);
    return null;
  }
}

export async function requestPushPermission() {
  if (!('Notification' in window)) {
    console.warn('Notificações não suportadas neste navegador');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * @deprecated Fluxo de inscricao push ainda nao esta integrado no app.
 * Mantido para compatibilidade ate a ativacao do backend de push.
 */
export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications não suportadas');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      return subscription;
    }

    const permission = await requestPushPermission();
    if (!permission) {
      console.warn('Permissão de notificação negada');
      return null;
    }

    if (!PUBLIC_VAPID_KEY) {
      console.warn('VITE_PUBLIC_VAPID_KEY não configurada. Push subscription ignorada.');
      return null;
    }

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    return newSubscription;
  } catch (error) {
    console.error('Erro ao inscrever em push notifications:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * @deprecated Utilitario local sem consumidor atual.
 */
export async function sendNotification(title, options = {}) {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers não suportados');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    const notificationOptions = {
      body: options.message || '',
      tag: options.tag || 'notificacao-huuel',
      requireInteraction: options.requireInteraction || false,
      data: {
        url: options.url || '/'
      }
    };

    await registration.showNotification(title, notificationOptions);
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
  }
}

/**
 * @deprecated Utilitario local sem consumidor atual.
 */
export function isNotificationSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}