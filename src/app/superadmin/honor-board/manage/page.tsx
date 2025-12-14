"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useEffect, useMemo, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import type { FundRaiserRow } from "@/lib/api";
import { superadminGetFundraisers, superadminUpdateFundraiser } from "@/lib/api";

export default function SuperadminHonorBoardManagePage() {
  useRequireAuth(["SUPERADMIN"]);

  const [year, setYear] = useState<string>("");
  const [month, setMonth] = useState<string>("");

  const [rows, setRows] = useState<FundRaiserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const totalAmount = useMemo(() => {
    return rows.reduce((acc, r) => acc + (r.amount || 0), 0);
  }, [rows]);

  async function load() {
    try {
      setErr(null);
      setLoading(true);

      const token = localStorage.getItem("access_token");
      const yearNum = year ? parseInt(year, 10) : undefined;
      const monthNum = month ? parseInt(month, 10) : undefined;

      const data = await superadminGetFundraisers(token, {
        year: yearNum,
        month: monthNum,
      });

      setRows(data);
    } catch (e: any) {
      setErr(e.message || "تعذر تحميل بيانات لوحة الشرف");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(r: FundRaiserRow) {
    setEditingId(r.id);
    setEditName(r.name || "");
    setEditAmount(String(r.amount ?? ""));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditAmount("");
  }

  async function saveEdit() {
    if (!editingId) return;

    const name = editName.trim();
    if (!name) {
      alert("من فضلك اكتب الاسم");
      return;
    }

    let amountNum: number | undefined = undefined;
    if (editAmount.trim() !== "") {
      const v = parseFloat(editAmount);
      if (isNaN(v) || v <= 0) {
        alert("المبلغ لازم يكون رقم أكبر من صفر");
        return;
      }
      amountNum = v;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("access_token");

      const updated = await superadminUpdateFundraiser(token, editingId, {
        name,
        amount: amountNum,
      });

      setRows((prev) => prev.map((x) => (x.id === editingId ? { ...x, ...updated } : x)));
      cancelEdit();
    } catch (e: any) {
      alert(e.message || "تعذر حفظ التعديل");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="إدارة لوحة الشرف" />

      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h1 className="text-lg font-bold text-slate-800 mb-2">تعديل سجلات لوحة الشرف</h1>
          <p className="text-sm text-slate-600">
            تقدر تعدّل الاسم أو المبلغ. لو المبلغ اتغير، هيتعمل قيد تعديل في دفتر الاتحاد بقيمة الفرق.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-2 items-end">
          <div>
            <div className="text-xs text-slate-600 mb-1">السنة</div>
            <input
              type="number"
              className="border rounded-lg px-3 py-2 text-right w-32"
              placeholder="مثال: 2025"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-slate-600 mb-1">الشهر</div>
            <select
              className="border rounded-lg px-3 py-2 text-right w-40"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">كل الشهور</option>
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
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm"
            disabled={loading}
          >
            {loading ? "تحميل..." : "تحديث"}
          </button>

          <div className="mr-auto text-sm">
            <span className="text-slate-600">إجمالي المساهمات المعروضة: </span>
            <span className="font-bold text-emerald-700">{totalAmount.toFixed(2)} جنيه</span>
          </div>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {err}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-4">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">لا توجد سجلات لعرضها.</p>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-slate-600">
                    <th className="py-2">الاسم</th>
                    <th className="py-2">المبلغ</th>
                    <th className="py-2">الشهر/السنة</th>
                    <th className="py-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isEditing = editingId === r.id;

                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 align-top">
                          {isEditing ? (
                            <input
                              className="border rounded-lg px-2 py-1 w-full"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          ) : (
                            r.name
                          )}
                        </td>

                        <td className="py-2 align-top">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              className="border rounded-lg px-2 py-1 w-40"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                            />
                          ) : (
                            `${(r.amount ?? 0).toFixed(2)}`
                          )}
                        </td>

                        <td className="py-2 align-top">
                          {r.month}/{r.year}
                        </td>

                        <td className="py-2 align-top">
                          {!isEditing ? (
                            <button
                              className="px-3 py-1 rounded-lg bg-brand-cyan text-white text-xs"
                              onClick={() => startEdit(r)}
                            >
                              تعديل
                            </button>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-60"
                                disabled={saving}
                                onClick={saveEdit}
                              >
                                {saving ? "حفظ..." : "حفظ"}
                              </button>
                              <button
                                className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs"
                                onClick={cancelEdit}
                                disabled={saving}
                              >
                                إلغاء
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
