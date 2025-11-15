"use client";

import { useState } from "react";
import { getFirebaseMessaging } from "@/lib/firebase";
import { getToken } from "firebase/messaging";
import { registerNotificationToken } from "@/lib/api";

export default function EnableNotificationsButton() {
  const [status, setStatus] = useState<"idle" | "asking" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleEnable() {
    try {
      setStatus("asking");
      setMessage(null);

      if (typeof window === "undefined") {
        throw new Error("البيئة الحالية لا تدعم الإشعارات.");
      }

      if (!("Notification" in window)) {
        throw new Error("المتصفح لا يدعم الإشعارات.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("لم يتم السماح بالإشعارات.");
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        throw new Error("خدمة الإشعارات غير مدعومة في هذا المتصفح.");
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        throw new Error("مفقود VAPID key في إعدادات النظام.");
      }

      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!fcmToken) {
        throw new Error("تعذر الحصول على رمز الإشعارات (FCM token).");
      }

      // Send to backend
      await registerNotificationToken(fcmToken);

      setStatus("success");
      setMessage("تم تفعيل الإشعارات بنجاح 🎉");
    } catch (err: any) {
      console.error("Enable notifications error:", err);
      setStatus("error");
      setMessage(err.message || "حدث خطأ أثناء تفعيل الإشعارات.");
    }
  }

  return (
    <div className="space-y-1 text-right">
      <button
        type="button"
        onClick={handleEnable}
        disabled={status === "asking"}
        className="px-3 py-2 rounded-lg bg-brand-cyan text-white text-sm font-semibold disabled:opacity-60"
      >
        {status === "asking" ? "جارٍ التفعيل..." : "تفعيل إشعارات التأخير"}
      </button>
      {message && (
        <p
          className={`text-xs ${
            status === "success" ? "text-green-700" : "text-red-700"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
