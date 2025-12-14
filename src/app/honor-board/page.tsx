"use client";

import { useEffect, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { publicGetFundraisers, type FundRaiserRow } from "@/lib/api";

export default function HonorBoardPage() {
  const [rows, setRows] = useState<FundRaiserRow[]>([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const data = await publicGetFundraisers({
        year: parseInt(year, 10),
        month: parseInt(month, 10),
      });
      setRows(data);
    } catch (e: any) {
      setErr(e.message || "تعذر تحميل لوحة الشرف");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="لوحة الشرف" />

      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">لوحة الشرف</h1>
            <p className="text-sm text-slate-600">
              قائمة المساهمين لدعم الاتحاد (حسب الشهر).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              className="border rounded-lg px-3 py-2 text-right w-28"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <select
              className="border rounded-lg px-3 py-2 text-right w-28"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </option>
              ))}
            </select>

            <button
              onClick={load}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm"
            >
              تحديث
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex justify-between text-sm text-slate-700 mb-3">
            <span>إجمالي التبرعات للشهر:</span>
            <span className="font-bold text-emerald-700">{total.toFixed(2)} جنيه</span>
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
              {err}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-slate-600">جارٍ التحميل...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-600">لا توجد مساهمات مسجلة.</div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-right text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b">
                    <th className="py-2 px-3">الاسم</th>
                    <th className="py-2 px-3">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 px-3">{r.name}</td>
                      <td className="py-2 px-3 font-semibold">{r.amount.toFixed(2)} جنيه</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
