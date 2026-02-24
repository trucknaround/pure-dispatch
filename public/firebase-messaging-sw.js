importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDKCS1O6ZPesfsBQntS0aH4cXTOLsxK6iw",
  authDomain: "pure-dispatch.firebaseapp.com",
  projectId: "pure-dispatch",
  messagingSenderId: "989948959336",
  appId: "1:989948959336:web:b3ccd664e8adf2af80b9dd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/pure-dispatch-logo.png',
    badge: '/pure-dispatch-logo.png',
    data: payload.data
  });
});
