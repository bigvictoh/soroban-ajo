const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Converts a URL-safe base64 string to a Uint8Array.
 * Used for VAPID public key conversion.
 * 
 * @param base64String - The base64 string to convert
 * @returns Uint8Array representation
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the Service Worker for push notification support.
 * 
 * @returns ServiceWorkerRegistration or null if not supported/failed
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (error) {
    return null;
  }
}

/**
 * Request permission from the user to show browser notifications.
 * 
 * @returns The resulting notification permission status
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Subscribe the current user to push notifications via the service worker.
 * Registers the subscription with the backend API.
 *
 * @returns The PushSubscription object or null if failed
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  const registration = await registerServiceWorker();
  if (!registration) return null;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return null;
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY ? (urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any) : undefined,
    });

    // Register with backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    await fetch(`${apiUrl}/api/notifications/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(subscription.toJSON()),
    }).catch(() => {/* non-fatal */});

    return subscription;
  } catch (error) {
    return null;
  }
}

/**
 * Unsubscribe the current user from push notifications.
 * 
 * @returns True if successfully unsubscribed, false otherwise
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Show a browser notification manually if permission is granted.
 * 
 * @param title - Notification title
 * @param options - Standard notification options
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
}
