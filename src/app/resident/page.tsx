"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import { getResidentProfile, getResidentInvoices } from "@/lib/api";

type Profile = {
  user: {
    id: number;
    username: string;
    role: string;
  };
  person: {
    full_name: string | null;
    building: string | null;
    floor: string | null;
    apartment: string | null;
  };
};

type Invoice = {
  id: number;
  year: number;
  month: number;
  amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
};

export default function ResidentPage() {
  const { user, loading: authLoading } = useRequireAuth(["RESIDENT"]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (authLoading) return;
  if (typeof window === "undefined") return;

  const token = localStorage.getItem("access_token");

  async function loadData() {
    try {
      setError(null);
      setLoading(true);

      const [p, inv] = await Promise.all([
        getResidentProfile(token),
        getResidentInvoices(token),
      ]);

      setProfile(p);
      setInvoices(inv);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    setError("لم يتم العثور على جلسة تسجيل الدخول");
    setLoading(false);
    return;
  }

  loadData();
}, [authLoading]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-beige" dir="rtl">
        <p className="text-sm text-slate-600">جارٍ تحميل بيانات المقيم...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-beige" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm p-4 max-w-md w-full text-center">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <p className="text-xs text-slate-500">
            حاول تسجيل الدخول مرة أخرى من الصفحة الرئيسية.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 bg-brand-beige" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header / Profile card */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              صفحة المقيم
            </h1>
            <p className="text-sm text-slate-600">
              مرحباً{" "}
              <span className="font-semibold">
                {profile?.person.full_name || profile?.user.username}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              الوحدة: مبنى {profile?.person.building} – دور{" "}
              {profile?.person.floor} – شقة {profile?.person.apartment}
            </p>
          </div>
        </div>

        {/* Invoices table */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            فواتير الصيانة الشهرية
          </h2>

          {invoices.length === 0 ? (
            <p className="text-sm text-slate-600">
              لا توجد فواتير مسجلة حتى الآن.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="border px-2 py-1">الشهر</th>
                    <th className="border px-2 py-1">القيمة (جنيه)</th>
                    <th className="border px-2 py-1">الحالة</th>
                    <th className="border px-2 py-1">تاريخ الاستحقاق</th>
                    <th className="border px-2 py-1">تاريخ السداد</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="text-slate-700">
                      <td className="border px-2 py-1 text-center">
                        {inv.month}/{inv.year}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {inv.amount.toFixed(2)}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {inv.status === "PAID" && (
                          <span className="text-green-600 font-semibold">
                            مسددة
                          </span>
                        )}
                        {inv.status === "PENDING" && (
                          <span className="text-amber-600 font-semibold">
                            غير مسددة
                          </span>
                        )}
                        {inv.status === "OVERDUE" && (
                          <span className="text-red-600 font-semibold">
                            متأخرة
                          </span>
                        )}
                      </td>
                      <td className="border px-2 py-1 text-center text-xs">
                        {inv.due_date || "-"}
                      </td>
                      <td className="border px-2 py-1 text-center text-xs">
                        {inv.paid_date || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-3">
            لاحقاً سيتم إضافة إمكانية تحميل فاتورة PDF لكل شهر، مع تفاصيل
            السداد ورقم الإيصال.
          </p>
        </div>
      </div>
    </main>
  );
}
