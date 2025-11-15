/* public/firebase-messaging-sw.js */

/* We use compat version here for simplicity */
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAzKc-ZACer1_P6YEfpFjqnGrlCSd24eHY",
  authDomain: "airnavcompound.firebaseapp.com",
  projectId: "airnavcompound",
  storageBucket: "airnavcompound.firebasestorage.app",
  messagingSenderId: "425107025888",
  appId: "1:425107025888:web:dac64f8bf248f81ea84585",
  measurementId: "G-9ELGR43Y5Q"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notificationTitle = payload.notification?.title || "تنبيه من اتحاد الشاغلين";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/favicon.ico",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
