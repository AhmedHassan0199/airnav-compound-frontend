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
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h1 className="text-lg font-bold text-slate-800 mb-2">
            الصفحة الرئيسية للمشرف العام
          </h1>
          <p className="text-sm text-slate-600">
            اختر العملية التي تريد القيام بها:
          </p>
        </div>

        {/* Buttons */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">

          {/* 1 – توزيع المباني */}
          <button
            onClick={() => router.push("/superadmin/admin-buildings")}
            className="w-full px-4 py-3 bg-brand-cyan text-white rounded-lg text-sm font-semibold hover:bg-[#008B9A] transition-colors"
          >
            ١- توزيع المباني على المسؤولين
          </button>

          {/* 2 – إنشاء مستخدم موظف */}
          <button
            onClick={() => router.push("/superadmin/users/admin")}
            className="w-full px-4 py-3 bg-white border border-brand-cyan text-brand-cyan rounded-lg text-sm font-semibold hover:bg-[#E0F5F7] transition-colors"
          >
            ٢- إنشاء مستخدم موظف جديد
          </button>

          {/* 3 – إنشاء مستخدم ساكن */}
          <button
            onClick={() => router.push("/superadmin/users/resident")}
            className="w-full px-4 py-3 bg-white border border-brand-cyan text-brand-cyan rounded-lg text-sm font-semibold hover:bg-[#E0F5F7] transition-colors"
          >
            ٣- إنشاء مستخدم ساكن جديد
          </button>

          {/* ⭐ 4 – تعديل بيانات الساكن */}
          <button
            onClick={() => router.push("/superadmin/residents/profile")}
            className="w-full px-4 py-3 bg-white border border-brand-cyan text-brand-cyan rounded-lg text-sm font-semibold hover:bg-[#E0F5F7] transition-colors"
          >
            ٤- تعديل بيانات ساكن
          </button>

          {/* ⭐ 5 – تعديل حالة فواتير الساكن */}
          <button
            onClick={() => router.push("/superadmin/residents/invoices")}
            className="w-full px-4 py-3 bg-white border border-brand-cyan text-brand-cyan rounded-lg text-sm font-semibold hover:bg-[#E0F5F7] transition-colors"
          >
            ٥- تعديل حالة فواتير ساكن
          </button>
          {/* ⭐ 6 – لوحة الشرف (Fund Raising) */}
          <button
            onClick={() => router.push("/superadmin/honor-board")}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            ٦- لوحة الشرف (Fund Raising)
          </button>
        </div>
      </div>
    </main>
  );
}
