"use client";

import { useState } from "react";
import { sendTestNotification } from "@/lib/api";

export function TestNotificationButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    try {
      setLoading(true);
      setMsg(null);
      setError(null);
      const result = await sendTestNotification();
      setMsg("تم إرسال الإشعار، برجاء التحقق من جهازك 📱");
      console.log("Test notification result:", result);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إرسال الإشعار التجريبي");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1 text-right">
      <button
        type="button"
        onClick={handleTest}
        disabled={loading}
        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-60"
      >
        {loading ? "جارٍ الإرسال..." : "إرسال إشعار تجريبي"}
      </button>
      {msg && <p className="text-xs text-green-700">{msg}</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
