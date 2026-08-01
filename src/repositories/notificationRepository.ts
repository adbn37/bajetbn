import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type { BackgroundReminderCheckResult } from '../types/models';

export interface BrowserPushSupport {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | 'unavailable';
  message: string;
}

const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();

async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) throw new Error('Device notifications are not supported in this browser.');
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing || navigator.serviceWorker.ready;
}

export async function getBrowserPushSupport(): Promise<BrowserPushSupport> {
  const supported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && await isSupported().catch(() => false);
  if (!supported) {
    return {
      supported: false,
      configured: Boolean(vapidKey),
      permission: 'unavailable',
      message: 'Device notifications are not supported in this browser.',
    };
  }
  if (!vapidKey) {
    return {
      supported: true,
      configured: false,
      permission: Notification.permission,
      message: 'Device notifications are not configured for this BajetBN environment yet.',
    };
  }
  if (Notification.permission === 'denied') {
    return {
      supported: true,
      configured: true,
      permission: 'denied',
      message: 'Notifications are blocked in this browser. Allow them in the site settings first.',
    };
  }
  return {
    supported: true,
    configured: true,
    permission: Notification.permission,
    message: Notification.permission === 'granted'
      ? 'This device can receive BajetBN reminders.'
      : 'Allow notifications to receive reminders on this device.',
  };
}

export async function enableBrowserPush(): Promise<void> {
  const support = await getBrowserPushSupport();
  if (!support.supported || !support.configured) throw new Error(support.message);
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not allowed.');

  const { app, functions } = requireFirebase();
  const registration = await serviceWorkerRegistration();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('This browser did not provide a notification token.');

  const register = httpsCallable(functions, 'registerPushDevice');
  const userAgentData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  await register({
    token,
    userAgent: navigator.userAgent.slice(0, 240),
    platform: userAgentData?.platform || navigator.platform || '',
  });
}

export async function disableBrowserPush(): Promise<void> {
  const { app, functions } = requireFirebase();
  let token = '';
  if (await isSupported().catch(() => false)) {
    try {
      const registration = await serviceWorkerRegistration();
      const messaging = getMessaging(app);
      if (vapidKey && Notification.permission === 'granted') {
        token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      }
      await deleteToken(messaging).catch(() => false);
    } catch {
      // The server-side disable below still turns off every saved device token.
    }
  }
  const unregister = httpsCallable(functions, 'unregisterPushDevice');
  await unregister({ token });
}

export async function runMyBackgroundReminderCheck(): Promise<BackgroundReminderCheckResult> {
  const { functions } = requireFirebase();
  const callable = httpsCallable(functions, 'runMyBackgroundReminderCheck');
  const result = await callable();
  return result.data as BackgroundReminderCheckResult;
}

export async function listenForForegroundPush(
  callback: (payload: MessagePayload) => void,
): Promise<() => void> {
  if (!vapidKey || !await isSupported().catch(() => false)) return () => undefined;
  const { app } = requireFirebase();
  return onMessage(getMessaging(app), callback);
}
