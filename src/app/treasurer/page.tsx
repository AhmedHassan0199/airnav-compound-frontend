"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import {
  treasurerGetAdmins,
  treasurerGetAdminDetails,
  treasurerCreateSettlement,
  treasurerGetSummary
} from "@/lib/api";

type AdminSummary = {
  total_amount: number;
  settled_amount: number;
  outstanding_amount: number;
  payments_count: number;
};

type AdminItem = {
  id: number;
  username: string;
  full_name: string;
  summary: AdminSummary;
};

type AdminDetails = {
  admin: {
    id: number;
    username: string;
    full_name: string;
  };
  summary: AdminSummary;
  recent_settlements: {
    id: number;
    amount: number;
    created_at: string;
    treasurer_name: string;
    notes: string | null;
  }[];
};

export default function TreasurerPage() {
  const { user, loading: authLoading } = useRequireAuth(["TREASURER"]);

  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<AdminItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminItem | null>(null);
  const [details, setDetails] = useState<AdminDetails | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [summary, setSummary] = useState<{
  total_collected: number;
  total_settled: number;
  union_balance: number;
  today_collected: number;
  this_month_collected: number;
  total_invoices: number;
  paid_invoices: number;
  unpaid_invoices: number;
  } | null>(null);

  // Settlement form
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (typeof window === "undefined") return;

    loadAdmins();
    loadSummary();
  }, [authLoading]);

  async function loadAdmins() {
    try {
      setError(null);
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetAdmins(token);
      setAdmins(data);
      setFilteredAdmins(data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل المسؤولين");
    } finally {
      setLoading(false);
    }
  }
  async function loadSummary() {
  try {
    const token = localStorage.getItem("access_token");
    const data = await treasurerGetSummary(token);
    setSummary(data);
  } catch (err) {
    // optional: ignore or show a small message
  }
}

  function handleSearchChange(value: string) {
    setSearch(value);
    const q = value.trim().toLowerCase();
    if (!q) {
      setFilteredAdmins(admins);
      return;
    }
    setFilteredAdmins(
      admins.filter((a) => {
        return (
          a.full_name.toLowerCase().includes(q) ||
          a.username.toLowerCase().includes(q)
        );
      })
    );
  }

  async function selectAdmin(admin: AdminItem) {
    setSelectedAdmin(admin);
    setDetails(null);
    setAmount("");
    setNotes("");

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetAdminDetails(token, admin.id);
      setDetails(data);

      const outstanding = data.summary.outstanding_amount;
      if (outstanding > 0) {
        setAmount(outstanding.toFixed(2));
      } else {
        setAmount("");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل بيانات المسؤول");
    } finally {
      setLoading(false);
    }
  }

  async function submitSettlement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAdmin || !details) return;

    const outstanding = details.summary.outstanding_amount;
    if (!amount) {
      alert("برجاء إدخال مبلغ التسوية.");
      return;
    }
    const value = parseFloat(amount);
    if (value <= 0) {
      alert("المبلغ يجب أن يكون أكبر من صفر.");
      return;
    }
    if (value > outstanding + 1e-6) {
      alert(
        `المبلغ المدخل أكبر من الرصيد المطلوب تسويته (${outstanding.toFixed(
          2
        )} جنيه).`
      );
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("access_token");
      const result = await treasurerCreateSettlement(token, {
        admin_id: selectedAdmin.id,
        amount: value,
        notes: notes || undefined,
      });

      // update details summary
      const newSummary = result.summary as AdminSummary;

      setDetails((prev) =>
        prev
          ? {
              ...prev,
              summary: newSummary,
            }
          : prev
      );

      // also update admin in the list
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === selectedAdmin.id ? { ...a, summary: newSummary } : a
        )
      );
      setFilteredAdmins((prev) =>
        prev.map((a) =>
          a.id === selectedAdmin.id ? { ...a, summary: newSummary } : a
        )
      );

      // reset form
      setNotes("");
      const newOutstanding = newSummary.outstanding_amount;
      if (newOutstanding > 0) {
        setAmount(newOutstanding.toFixed(2));
      } else {
        setAmount("");
      }

      // Reload details to get latest settlements list
      const data = await treasurerGetAdminDetails(token, selectedAdmin.id);
      setDetails(data);
    } catch (err: any) {
      alert(err.message || "تعذر تسجيل التسوية");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-beige" dir="rtl">
        <p className="text-sm text-slate-600">جارٍ التحقق من الجلسة...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="لوحة تحكم أمين الصندوق" />
      {summary && (
      <div className="max-w-6xl mx-auto mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="text-xs text-slate-600">رصيد الاتحاد الحالي</div>
            <div className="text-lg font-bold text-slate-800 mt-1">
              {summary.union_balance.toFixed(2)} جنيه
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="text-xs text-slate-600">تحصيل شهر {new Date().getMonth() + 1}</div>
            <div className="text-lg font-bold text-slate-800 mt-1">
              {summary.this_month_collected.toFixed(2)} جنيه
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="text-xs text-slate-600">تحصيل اليوم</div>
            <div className="text-lg font-bold text-slate-800 mt-1">
              {summary.today_collected.toFixed(2)} جنيه
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="text-xs text-slate-600">فواتير مدفوعة / إجمالي</div>
            <div className="text-lg font-bold text-slate-800 mt-1">
              {summary.paid_invoices} / {summary.total_invoices}
            </div>
          </div>
        </div>
      </div>
      )}
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              لوحة أمين الصندوق
            </h1>
            <p className="text-sm text-slate-600">
              استعرض أرصدة مسؤولي التحصيل، وسجّل التسويات النقدية معهم.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              بحث عن مسؤول تحصيل
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              placeholder="الاسم أو اسم المستخدم"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Layout: Admin list + details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Admin list */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-3 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">
              مسؤولو التحصيل
            </h2>
            {loading && admins.length === 0 ? (
              <p className="text-sm text-slate-600">جارٍ تحميل البيانات...</p>
            ) : filteredAdmins.length === 0 ? (
              <p className="text-sm text-slate-600">
                لا توجد نتائج. جرّب تعديل البحث.
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {filteredAdmins.map((admin) => (
                  <button
                    key={admin.id}
                    className={`w-full text-right border rounded-lg p-3 text-sm hover:bg-slate-50 transition ${
                      selectedAdmin?.id === admin.id
                        ? "border-brand-cyan bg-slate-50"
                        : "border-slate-200"
                    }`}
                    onClick={() => selectAdmin(admin)}
                  >
                    <div className="font-semibold text-slate-800">
                      {admin.full_name}
                    </div>
                    <div className="text-xs text-slate-600">
                      اسم المستخدم: {admin.username}
                    </div>
                    <div className="text-xs mt-1">
                      <span className="text-slate-600">رصيد مطلوب تسويته: </span>
                      <span
                        className={
                          admin.summary.outstanding_amount > 0
                            ? "text-orange-700 font-semibold"
                            : "text-green-700 font-semibold"
                        }
                      >
                        {admin.summary.outstanding_amount.toFixed(2)} جنيه
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details + settlement */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white rounded-xl shadow-sm p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                تفاصيل مسؤول التحصيل
              </h2>
              {!selectedAdmin ? (
                <p className="text-sm text-slate-600">
                  اختر مسؤول تحصيل من القائمة لعرض تفاصيله.
                </p>
              ) : loading && !details ? (
                <p className="text-sm text-slate-600">
                  جارٍ تحميل تفاصيل {selectedAdmin.full_name}...
                </p>
              ) : !details ? (
                <p className="text-sm text-slate-600">
                  لم يتم تحميل التفاصيل. حاول مرة أخرى.
                </p>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-xs text-slate-600">
                        إجمالي المبالغ المحصلة بواسطة هذا المسؤول
                      </div>
                      <div className="text-lg font-bold text-slate-800 mt-1">
                        {details.summary.total_amount.toFixed(2)} جنيه
                      </div>
                    </div>
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-xs text-slate-600">
                        المبالغ المسددة للخزينة
                      </div>
                      <div className="text-lg font-bold text-slate-800 mt-1">
                        {details.summary.settled_amount.toFixed(2)} جنيه
                      </div>
                    </div>
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-xs text-slate-600">
                        الرصيد المطلوب تسويته
                      </div>
                      <div className="text-lg font-bold text-orange-700 mt-1">
                        {details.summary.outstanding_amount.toFixed(2)} جنيه
                      </div>
                    </div>
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-xs text-slate-600">
                        عدد الفواتير المحصلة
                      </div>
                      <div className="text-lg font-bold text-slate-800 mt-1">
                        {details.summary.payments_count}
                      </div>
                    </div>
                  </div>

                  {/* Settlement form */}
                  <div className="border rounded-lg p-3 mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">
                      تسجيل تسوية جديدة
                    </h3>
                    {details.summary.outstanding_amount <= 0 ? (
                      <p className="text-sm text-green-700">
                        لا يوجد رصيد مستحق على هذا المسؤول حالياً.
                      </p>
                    ) : (
                      <form
                        onSubmit={submitSettlement}
                        className="space-y-3 text-sm max-w-md"
                      >
                        <div>
                          <label className="block mb-1 text-slate-700">
                            المبلغ المسلّم (جنيه)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full border rounded-lg px-3 py-2 text-right"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            لا يمكن أن يزيد عن الرصيد المطلوب تسويته (
                            {details.summary.outstanding_amount.toFixed(2)} جنيه).
                          </p>
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">
                            ملاحظات (اختياري)
                          </label>
                          <textarea
                            className="w-full border rounded-lg px-3 py-2 text-right text-sm"
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="مثال: تسوية عن شهر سبتمبر بالكامل."
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                        >
                          {saving ? "جارٍ الحفظ..." : "تسجيل التسوية"}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Recent settlements */}
                  <div className="border rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">
                      آخر التسويات المسجلة
                    </h3>
                    {details.recent_settlements.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        لا توجد تسويات مسجلة لهذا المسؤول حتى الآن.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 text-sm">
                        {details.recent_settlements.map((s) => (
                          <div
                            key={s.id}
                            className="border rounded-lg p-3 bg-slate-50"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {s.amount.toFixed(2)} جنيه
                              </span>
                              <span className="text-xs text-slate-600">
                                {s.created_at}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              مسجّلة بواسطة: {s.treasurer_name}
                            </div>
                            {s.notes && (
                              <div className="text-xs text-slate-600 mt-1">
                                ملاحظات: {s.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
