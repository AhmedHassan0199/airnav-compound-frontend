"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useMemo, useState } from "react";
import type { BuildingUnitStatusRow } from "@/lib/api";
import { publicGetBuildingUnitsStatus } from "@/lib/api";

export default function PublicBuildingsPage() {
  const now = new Date();
  const [building, setBuilding] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  const [rows, setRows] = useState<BuildingUnitStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paidFilter, setPaidFilter] = useState<string>(""); // "", "PAID", "UNPAID"
  const [methodFilter, setMethodFilter] = useState<string>(""); // "", "ONLINE", "CASH"
  const [search, setSearch] = useState<string>("");

  async function load() {
    if (!building.trim()) {
      setError("اكتب رقم العمارة الأول");
      return;
    }
    try {
      setError(null);
      setLoading(true);

      const data = await publicGetBuildingUnitsStatus({
        building: building.trim(),
        year: year ? parseInt(year, 10) : undefined,
        month: month ? parseInt(month, 10) : undefined,
      });

      setRows(data.units || []);
    } catch (e: any) {
      setError(e.message || "تعذر تحميل شقق العمارة");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (paidFilter === "PAID" && !r.paid_current_month) return false;
      if (paidFilter === "UNPAID" && r.paid_current_month) return false;

      if (methodFilter && (r.payment_method || "") !== methodFilter) return false;

      if (q) {
        const blob = `${r.full_name} ${r.floor ?? ""} ${r.apartment ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, paidFilter, methodFilter, search]);

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="حالة سداد شقق العمارات" />

      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">
            ابحث عن عمارة وشوف حالة السداد لشهر محدد
          </h2>

          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <div className="text-xs text-slate-600 mb-1">رقم العمارة</div>
              <input
                className="border rounded-lg px-3 py-2 text-right w-40"
                placeholder="مثال: 12"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs text-slate-600 mb-1">السنة</div>
              <input
                type="number"
                className="border rounded-lg px-3 py-2 text-right w-28"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs text-slate-600 mb-1">الشهر</div>
              <select
                className="border rounded-lg px-3 py-2 text-right w-32"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="1">يناير</option>
                <option value="2">فبراير</option>
                <option value="3">مارس</option>
                <option value="4">أبريل</option>
                <option value="5">مايو</option>
                <option value="6">يونيو</option>
                <option value="7">يوليو</option>
                <option value="8">أغسطس</option>
                <option value="9">سبتمبر</option>
                <option value="10">أكتوبر</option>
                <option value="11">نوفمبر</option>
                <option value="12">ديسمبر</option>
              </select>
            </div>

            <button
              onClick={load}
              className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm"
              disabled={loading}
            >
              {loading ? "تحميل..." : "عرض الشقق"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <input
              className="border rounded-lg px-2 py-2 text-right w-56"
              placeholder="بحث بالاسم / الدور / الشقة"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="border rounded-lg px-2 py-2 text-right"
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value)}
            >
              <option value="">كل الحالات</option>
              <option value="PAID">مدفوع</option>
              <option value="UNPAID">غير مدفوع</option>
            </select>

            <select
              className="border rounded-lg px-2 py-2 text-right"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="">كل الطرق</option>
              <option value="ONLINE">ONLINE</option>
              <option value="CASH">CASH</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            النتائج
          </h3>

          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">
              اكتب رقم عمارة وحدد شهر/سنة واضغط "عرض الشقق".
            </p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-slate-600">
                    <th className="py-2">الاسم</th>
                    <th className="py-2">الدور</th>
                    <th className="py-2">الشقة</th>
                    <th className="py-2">الحالة</th>
                    <th className="py-2">المبلغ المدفوع</th>
                    <th className="py-2">طريقة الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.user_id} className="border-b last:border-0">
                      <td className="py-2">{r.full_name}</td>
                      <td className="py-2">{r.floor ?? "-"}</td>
                      <td className="py-2">{r.apartment ?? "-"}</td>
                      <td className="py-2">
                        {r.paid_current_month ? (
                          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px]">
                            مدفوع
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-[11px]">
                            غير مدفوع
                          </span>
                        )}
                      </td>
                      <td className="py-2">{(r.paid_amount ?? 0).toFixed(2)}</td>
                      <td className="py-2">{r.payment_method ?? "-"}</td>
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
