import { useEffect } from 'react';

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

        const { initializeApp, getApps } = await import('firebase/app');
        const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

        const firebaseConfig = {
          apiKey: "AIzaSyDKCS1O6ZPesfsBQntS0aH4cXTOLsxK6iw",
          authDomain: "pure-dispatch.firebaseapp.com",
          projectId: "pure-dispatch",
          messagingSenderId: "989948959336",
          appId: "1:989948959336:web:b3ccd664e8adf2af80b9dd"
        };

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const messaging = getMessaging(app);

        const fcmToken = await getToken(messaging, {
          vapidKey: process.env.REACT_APP_FCM_VAPID_KEY,
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
          const type = payload.data?.type || '';
          const emoji = {
            NEW_LOAD: '🚛', WEATHER_ALERT: '⚠️', BROKER_REPLY: '📞',
            BILLING_ISSUE: '💳', SYSTEM_ALERT: '📢'
          }[type] || '🔔';

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
