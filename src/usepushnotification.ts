// ============================================================
// PURE DISPATCH — FRONTEND PUSH NOTIFICATION HOOK
// usePushNotifications.ts
// ============================================================
// Drop this into your React app.
// Call usePushNotifications() in your main authenticated layout.
// It handles token registration automatically.
//
// For the mobile app (React Native/Expo):
//   Use expo-notifications instead — see bottom of file.
// ============================================================

import { useEffect, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://your-api.vercel.app';
const FCM_VAPID_KEY = process.env.REACT_APP_FCM_VAPID_KEY || ''; // From Firebase Console

export function usePushNotifications(userId: string | null, authToken: string | null) {
  
  const registerToken = useCallback(async (token: string) => {
    if (!authToken) return;
    try {
      await fetch(`${BACKEND_URL}/api/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token, platform: 'web' }),
      });
      console.log('[Push] Token registered with backend');
    } catch (err) {
      console.error('[Push] Failed to register token:', err);
    }
  }, [authToken]);

  useEffect(() => {
    if (!userId || !authToken) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Push notifications not supported in this browser');
      return;
    }

    async function setupPush() {
      try {
        // 1. Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('[Push] Notification permission denied');
          return;
        }

        // 2. Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('[Push] Service worker registered');

        // 3. Import Firebase messaging dynamically
        const { initializeApp } = await import('firebase/app');
        const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

        const app = initializeApp({
          apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
          authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.REACT_APP_FIREBASE_APP_ID,
        });

        const messaging = getMessaging(app);

        // 4. Get FCM token
        const fcmToken = await getToken(messaging, {
          vapidKey: FCM_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (fcmToken) {
          await registerToken(fcmToken);
        }

        // 5. Handle foreground messages (app is open)
        onMessage(messaging, (payload) => {
          console.log('[Push] Foreground message:', payload);
          
          // Show a custom in-app toast instead of system notification
          if (payload.notification) {
            showInAppNotification(
              payload.notification.title || 'Pure Dispatch',
              payload.notification.body || '',
              payload.data?.type as string
            );
          }
        });

      } catch (err) {
        console.error('[Push] Setup failed:', err);
      }
    }

    setupPush();
  }, [userId, authToken, registerToken]);
}

// ── Simple in-app toast for foreground notifications ──
function showInAppNotification(title: string, body: string, type?: string) {
  // You can swap this with your existing toast library
  // or build a custom notification component
  const emoji = getNotificationEmoji(type);
  
  // Create notification element
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: #111827;
    border: 1px solid #00FF88;
    border-radius: 12px;
    padding: 16px 20px;
    max-width: 340px;
    box-shadow: 0 0 20px rgba(0,255,136,0.2);
    animation: slideIn 0.3s ease;
    cursor: pointer;
  `;
  notif.innerHTML = `
    <div style="color:#00FF88;font-weight:bold;font-size:14px;margin-bottom:4px">${emoji} ${title}</div>
    <div style="color:#9CA3AF;font-size:13px">${body}</div>
  `;

  // Auto-dismiss after 5 seconds
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 5000);
  notif.onclick = () => notif.remove();
}

function getNotificationEmoji(type?: string): string {
  const map: Record<string, string> = {
    NEW_LOAD: '🚛',
    WEATHER_ALERT: '⚠️',
    BROKER_REPLY: '📞',
    BILLING_ISSUE: '💳',
    SUBSCRIPTION_EXPIRING: '⏰',
    LOAD_VERIFICATION_RESULT: '✅',
    SYSTEM_ALERT: '📢',
  };
  return map[type || ''] || '🔔';
}

// ============================================================
// EXPO / REACT NATIVE VERSION
// Use this in your mobile app instead of the hook above
// ============================================================
/*
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForMobilePushNotifications(
  userId: string,
  authToken: string
) {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return;
  }

  // Get Expo push token (for Expo's notification service)
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Register with Pure Dispatch backend
  await fetch(`${BACKEND_URL}/api/push/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token, platform: 'android' }),
  });

  // Listen for notifications when app is open
  Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
  });

  // Handle taps on notifications
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    // Navigate to the relevant screen based on data.screen
    console.log('Notification tapped, navigate to:', data.screen);
  });
}
*/
