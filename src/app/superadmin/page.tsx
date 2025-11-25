"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";

export default function SuperadminHomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth(["SUPERADMIN"]);

  if (authLoading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-brand-beige"
        dir="rtl"
      >
        <p className="text-sm text-slate-600">جارٍ التحقق من الجلسة...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="لوحة تحكم المشرف العام" />
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h1 className="text-lg font-bold text-slate-800 mb-2">
            الصفحة الرئيسية للمشرف العام
          </h1>
          <p className="text-sm text-slate-600">
            اختر العملية التي تريد القيام بها:
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <button
            onClick={() => router.push("/superadmin/admin-buildings")}
            className="w-full px-4 py-3 bg-brand-cyan text-white rounded-lg text-sm font-semibold hover:bg-[#008B9A] transition-colors"
          >
            ١- توزيع المباني على المسؤولين
          </button>

          <button
            onClick={() => router.push("/superadmin/users/admin")}
            className="w-full px-4 py-3 bg-white border border-brand-cyan text-brand-cyan rounded-lg text-sm font-semibold hover:bg-[#E0F5F7] transition-colors"
          >
            ٢- إنشاء مستخدم موظف جديد
          </button>

          <button
            onClick={() => router.push("/superadmin/users/resident")}
            className="w-full px-4 py-3 bg-white border border-brand-cyan text-brand-cyan rounded-lg text-sm font-semibold hover:bg-[#E0F5F7] transition-colors"
          >
            ٣- إنشاء مستخدم ساكن جديد
          </button>
        </div>
      </div>
    </main>
  );
}
