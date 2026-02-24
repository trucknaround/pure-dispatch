import { useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : '';

export function usePushNotifications(userId, authToken) {
  useEffect(() => {
    if (!userId || !authToken) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function setupPush() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const app = getApps().length === 0
          ? initializeApp({
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
              authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
              projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
              messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
              appId: import.meta.env.VITE_FIREBASE_APP_ID,
            })
          : getApps()[0];

        const messaging = getMessaging(app);

        const fcmToken = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (fcmToken) {
          await fetch(`${BACKEND_URL}/api/push-register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ token: fcmToken, platform: 'web' }),
          });
        }

        onMessage(messaging, (payload) => {
          if (!payload.notification) return;
          const { title, body } = payload.notification;
          const emoji = {
            NEW_LOAD: '🚛', WEATHER_ALERT: '⚠️', BROKER_REPLY: '📞',
            BILLING_ISSUE: '💳', SYSTEM_ALERT: '📢'
          }[payload.data?.type] || '🔔';

          const el = document.createElement('div');
          el.style.cssText = `
            position:fixed;top:20px;right:20px;z-index:9999;
            background:#111827;border:1px solid #00FF88;border-radius:12px;
            padding:16px 20px;max-width:320px;cursor:pointer;
            box-shadow:0 0 20px rgba(0,255,136,0.2);
          `;
          el.innerHTML = `
            <div style="color:#00FF88;font-weight:bold;font-size:14px;margin-bottom:4px">${emoji} ${title}</div>
            <div style="color:#9CA3AF;font-size:13px">${body}</div>
          `;
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 5000);
          el.onclick = () => el.remove();
        });

      } catch (err) {
        console.error('[Push] Setup failed:', err);
      }
    }

    setupPush();
  }, [userId, authToken]);
}
