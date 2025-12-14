"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useEffect, useMemo, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {superadminGetFundraisers,superadminCreateFundraiser} from "../../../lib/api"

type FundRaiserRow = {
  id: number;
  name: string;
  amount: number;
  year: number;
  month: number;
  created_at?: string | null;
};

function monthName(m: number) {
  const months = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  return months[m - 1] ?? String(m);
}





export default function SuperadminHonorBoardPage() {
  useRequireAuth(["SUPERADMIN"]);
  const router = useRouter();

  // Create form
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  // Filters (and also used for add)
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  // Table filters (separate so user can filter without affecting add inputs if you want)
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));

  const [rows, setRows] = useState<FundRaiserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const yearsList = useMemo(() => {
    // آخر 6 سنين + السنة الحالية + سنة جاية (احتياطي)
    const y = now.getFullYear();
    const arr: number[] = [];
    for (let i = y - 5; i <= y + 1; i++) arr.push(i);
    return arr;
  }, [now]);

  const orderedRows = useMemo(() => {
    return [...rows].sort((a, b) => b.id - a.id);
    }, [rows]);

  async function loadFundraisers() {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("access_token");

      const y = filterYear ? parseInt(filterYear, 10) : undefined;
      const m = filterMonth ? parseInt(filterMonth, 10) : undefined;

      const data = await superadminGetFundraisers(token, { year: y, month: m });
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "تعذر تحميل لوحة الشرف");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    loadFundraisers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    setSaveError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setSaveError("اكتب الاسم.");
      return;
    }

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setSaveError("اكتب مبلغ صحيح أكبر من صفر.");
      return;
    }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!y || y < 2000 || y > 3000) {
      setSaveError("اختار سنة صحيحة.");
      return;
    }
    if (!m || m < 1 || m > 12) {
      setSaveError("اختار شهر صحيح.");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("access_token");

      await superadminCreateFundraiser(token, {
        name: cleanName,
        amount: value,
        year: y,
        month: m,
      });

      setName("");
      setAmount("");
      setSaveMsg("تمت الإضافة بنجاح ✅ وتم تحديث رصيد الاتحاد.");

      // لو الفلتر الحالي نفس سنة/شهر الإضافة، اعمل reload عشان تظهر فورًا
      if (String(y) === filterYear && String(m) === filterMonth) {
        await loadFundraisers();
      }
    } catch (err: any) {
      setSaveError(err.message || "تعذر إضافة التبرع");
    } finally {
      setSaving(false);
    }
  }

  const totalForPeriod = useMemo(() => {
    return rows.reduce((acc, r) => acc + (r.amount || 0), 0);
  }, [rows]);

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="لوحة الشرف (Fund Raising)" />

      <div className="max-w-5xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">لوحة الشرف</h1>
            <p className="text-sm text-slate-600">
              إضافة مساهمات دعم الاتحاد وعرضها للشفافية.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/superadmin")}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm"
            >
              رجوع للصفحة الرئيسية
            </button>
          </div>
        </div>

        {/* Add Fundraiser */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">
            إضافة مساهمة جديدة
          </h2>

          {saveMsg && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3 mb-3">
              {saveMsg}
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
              {saveError}
            </div>
          )}

          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-semibold text-slate-700">
                الاسم
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-right"
                placeholder="مثال: أحمد حسن"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-700">
                مبلغ المساهمة (جنيه)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-right"
                placeholder="مثال: 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  السنة
                </label>
                <select
                  className="w-full border rounded-lg px-2 py-2 text-right"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {yearsList.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  الشهر
                </label>
                <select
                  className="w-full border rounded-lg px-2 py-2 text-right"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const m = i + 1;
                    return (
                      <option key={m} value={String(m)}>
                        {monthName(m)}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-brand-cyan text-white text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "جارٍ الحفظ..." : "إضافة المساهمة"}
              </button>
            </div>
          </form>

          <p className="text-xs text-slate-500 mt-2">
            * لا يتم حفظ تاريخ كامل — فقط شهر/سنة كما طلبت.
          </p>
        </div>

        {/* Filters + Table */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                جدول لوحة الشرف
              </h2>
              <p className="text-xs text-slate-600">
                إجمالي المساهمات للفترة:{" "}
                <span className="font-semibold text-emerald-700">
                  {totalForPeriod.toFixed(2)} جنيه
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                className="border rounded-lg px-2 py-2 text-right"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                {yearsList.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                className="border rounded-lg px-2 py-2 text-right"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  return (
                    <option key={m} value={String(m)}>
                      {monthName(m)}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={loadFundraisers}
                className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm"
              >
                تحديث
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-slate-600">جارٍ تحميل البيانات...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-600">
              لا توجد مساهمات مسجلة لهذه الفترة.
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs sm:text-sm text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b text-slate-600">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">الاسم</th>
                    <th className="py-2 px-2">المبلغ (جنيه)</th>
                    <th className="py-2 px-2">الشهر / السنة</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedRows.map((r, idx) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 px-2">{idx + 1}</td>
                      <td className="py-2 px-2 font-semibold text-slate-800">
                        {r.name}
                      </td>
                      <td className="py-2 px-2 text-emerald-700 font-semibold">
                        {Number(r.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-slate-700">
                        {monthName(r.month)} / {r.year}
                      </td>
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
