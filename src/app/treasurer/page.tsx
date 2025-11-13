"use client";

import { useRequireAuth } from "@/lib/auth";

export default function TreasurerPage() {
  const { user, loading } = useRequireAuth(["TREASURER"]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-600">جارٍ تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen p-6 bg-brand-beige">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h1 className="text-xl font-bold text-slate-800">
          صفحة أمين الصندوق
        </h1>
        <p className="text-sm text-slate-600">
          مرحباً {user?.username} – الدور: {user?.role}
        </p>
        <p className="text-sm text-slate-600">
          هنا هنضيف شاشات التسويات، رصيد الاتحاد، ومديونيات المشرفين إن شاء الله.
        </p>
      </div>
    </main>
  );
}
