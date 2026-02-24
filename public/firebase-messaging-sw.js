importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Config is passed from the main app via messaging.useServiceWorker
// This file intentionally has no hardcoded keys
let messaging;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (!firebase.apps.length) {
      firebase.initializeApp(event.data.config);
    }
    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/pure-dispatch-logo.png',
        data: payload.data
      });
    });
  }
});
