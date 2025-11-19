"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useEffect, useMemo, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import {
  treasurerGetAdmins,
  treasurerGetAdminDetails,
  treasurerCreateSettlement,
  treasurerGetSummary,
  treasurerCreateExpense,
  treasurerGetExpenses,
  treasurerGetLedger,
  treasurerGetLateResidents,
  treasurerNotifyLateResidents,
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
  role: string;
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

type ExpenseItem = {
  id: number;
  date: string;
  amount: number;
  category: string | null;
  description: string;
  created_by: string;
};

type LedgerEntry = {
  id: number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance_after: number;
  entry_type: string;
  created_by: string;
};

type SummaryType = {
  total_collected: number;
  total_settled: number;
  total_expenses?: number;
  union_balance: number;
  today_collected: number;
  this_month_collected: number;
  total_invoices: number;
  paid_invoices: number;
  unpaid_invoices: number;
};

type LateResident = {
  user_id: number;
  username: string;
  full_name: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  phone: string | null;
  status_flags: {
    current_month_late: boolean;
    more_than_3_months: boolean;
    partial_payments: boolean;
  };
  total_overdue_amount: number;
  overdue_months: {
    year: number;
    month: number;
    amount: number;
    paid_amount: number;
    unpaid_amount: number;
  }[];
};

type LateResidentsResponse = {
  today: string;
  cutoff_day: number;
  late_residents: LateResident[];
};

export default function TreasurerPage() {
  useRequireAuth(["TREASURER"]);

  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<AdminItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminItem | null>(null);
  const [details, setDetails] = useState<AdminDetails | null>(null);

  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryType | null>(null);

  // Settlement form
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [savingSettlement, setSavingSettlement] = useState(false);

  // Expenses
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);

  // Ledger
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  // Late residents
  const [lateResidents, setLateResidents] = useState<LateResident[]>([]);
  const [lateToday, setLateToday] = useState<string | null>(null);
  const [lateCutoff, setLateCutoff] = useState<number | null>(null);
  const [lateError, setLateError] = useState<string | null>(null);
  const [lateLoading, setLateLoading] = useState(false);

  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  // Tabs
  type TabType = "SETTLEMENT" | "EXPENSES" | "LEDGER" | "LATE";
  const [activeTab, setActiveTab] = useState<TabType>("SETTLEMENT");

  // Load initial data
  useEffect(() => {
    if (typeof window === "undefined") return;

    loadSummary();
    loadAdmins();
    loadExpenses();
    loadLedger();
    loadLateResidents();
  }, []);

  async function loadSummary() {
    try {
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetSummary(token);
      setSummary(data);
    } catch {
      // ignore small errors here
    }
  }

  async function loadAdmins() {
    try {
      setError(null);
      setLoadingAdmins(true);
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetAdmins(token);
      setAdmins(data);
      setFilteredAdmins(data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل مسؤولي التحصيل");
    } finally {
      setLoadingAdmins(false);
    }
  }

  async function loadExpenses() {
    try {
      setExpenseError(null);
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetExpenses(token);
      setExpenses(data);
    } catch (err: any) {
      setExpenseError(err.message || "تعذر تحميل المصروفات");
    }
  }

  async function loadLedger() {
    try {
      setLedgerError(null);
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetLedger(token);
      setLedger(data);
    } catch (err: any) {
      setLedgerError(err.message || "تعذر تحميل دفتر الاتحاد");
    }
  }

  async function loadLateResidents() {
    try {
      setLateError(null);
      setLateLoading(true);
      const token = localStorage.getItem("access_token");
      const data: LateResidentsResponse = await treasurerGetLateResidents(token);
      setLateResidents(data.late_residents);
      setLateToday(data.today);
      setLateCutoff(data.cutoff_day);
    } catch (err: any) {
      setLateError(err.message || "تعذر تحميل قائمة السكان المتأخرين");
    } finally {
      setLateLoading(false);
    }
  }
  
  async function handleNotifyAllLate() {
    try {
      setNotifyLoading(true);
      setNotifyMsg(null);
      setNotifyError(null);

      const token = localStorage.getItem("access_token");
      const result = await treasurerNotifyLateResidents(token);

      setNotifyMsg(
        `تم محاولة إرسال إشعارات إلى ${result.total_targets} ساكن (من أصل ${result.total_late_residents} متأخرين). ` +
          `تم الإرسال بنجاح إلى ${result.total_sent}، وفشل الإرسال إلى ${result.total_failed}.`
      );
    } catch (err: any) {
      setNotifyError(err.message || "حدث خطأ أثناء إرسال الإشعارات.");
    } finally {
      setNotifyLoading(false);
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
      setLoadingAdmins(true);
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
      setLoadingAdmins(false);
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
      setSavingSettlement(true);
      const token = localStorage.getItem("access_token");
      const result = await treasurerCreateSettlement(token, {
        admin_id: selectedAdmin.id,
        amount: value,
        notes: notes || undefined,
      });

      const newSummary = result.summary as AdminSummary;

      setDetails((prev) =>
        prev
          ? {
              ...prev,
              summary: newSummary,
            }
          : prev
      );

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

      setNotes("");
      const newOutstanding = newSummary.outstanding_amount;
      if (newOutstanding > 0) {
        setAmount(newOutstanding.toFixed(2));
      } else {
        setAmount("");
      }

      const data = await treasurerGetAdminDetails(token, selectedAdmin.id);
      setDetails(data);

      // refresh summary + ledger
      await loadSummary();
      await loadLedger();
    } catch (err: any) {
      alert(err.message || "تعذر تسجيل التسوية");
    } finally {
      setSavingSettlement(false);
    }
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseAmount || !expenseDescription) {
      setExpenseError("برجاء إدخال مبلغ المصروف والوصف.");
      return;
    }

    const value = parseFloat(expenseAmount);
    if (isNaN(value) || value <= 0) {
      setExpenseError("برجاء إدخال مبلغ صحيح أكبر من صفر.");
      return;
    }

    try {
      setExpenseSaving(true);
      setExpenseError(null);
      const token = localStorage.getItem("access_token");

      await treasurerCreateExpense(token, {
        amount: value,
        description: expenseDescription,
        category: expenseCategory || undefined,
      });

      setExpenseAmount("");
      setExpenseCategory("");
      setExpenseDescription("");

      await loadExpenses();
      await loadSummary();
      await loadLedger();
    } catch (err: any) {
      setExpenseError(err.message || "تعذر تسجيل المصروف.");
    } finally {
      setExpenseSaving(false);
    }
  }

  // Stats from ledger (for tab 3)
  const ledgerStats = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    ledger.forEach((e) => {
      totalDebit += e.debit || 0;
      totalCredit += e.credit || 0;
    });
    return {
      totalDebit,
      totalCredit,
    };
  }, [ledger]);

  if (!summary && !admins.length && !loadingAdmins) {
    // first load placeholder (optional)
  }

  function buildWhatsAppLink(resident: LateResident) {
  if (!resident.phone) return "#";

  const cleanPhone = resident.phone.replace(/[^0-9]/g, "");
  const message = `السلام عليكم،
هذا تنبيه من اتحاد شاغلين مدينة الملاحة الجوية بوجود مديونية صيانة على وحدتكم.

إجمالي المديونية الحالية: ${resident.total_overdue_amount.toFixed(
    2
  )} جنيه.

برجاء التكرم بالسداد في أقرب وقت، أو التواصل مع أمين الصندوق للاستفسار.`;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  function printLateResidentsList() {
    if (!lateResidents.length) {
      alert("لا يوجد سكان متأخرون حالياً.");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;

    const rowsHtml = lateResidents
      .map((r, idx) => {
        const flags: string[] = [];
        if (r.status_flags.current_month_late) flags.push("متأخر عن الشهر الحالي");
        if (r.status_flags.more_than_3_months)
          flags.push("مديونية أكثر من ٣ أشهر");
        if (r.status_flags.partial_payments) flags.push("سداد جزئي");

        const months = r.overdue_months
          .map(
            (m) =>
              `${m.month}/${m.year} - الباقي: ${m.unpaid_amount.toFixed(2)} ج`
          )
          .join(" | ");

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${r.full_name}</td>
            <td>${r.building ?? "-"}/${r.floor ?? "-"}/${r.apartment ?? "-"}</td>
            <td>${r.total_overdue_amount.toFixed(2)}</td>
            <td>${flags.join(" - ") || "-"}</td>
            <td>${months}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>قائمة السكان المتأخرين</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: right; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>قائمة السكان المتأخرين عن سداد الصيانة</h1>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>العمارة/الدور/الشقة</th>
                <th>إجمالي المديونية (جنيه)</th>
                <th>الحالة</th>
                <th>الأشهر المتأخرة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="لوحة تحكم أمين الصندوق" />

      {/* Summary Cards (always visible) */}
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
              <div className="text-xs text-slate-600">
                تحصيل شهر {new Date().getMonth() + 1}
              </div>
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
              <div className="text-xs text-slate-600">
                فواتير مدفوعة / إجمالي
              </div>
              <div className="text-lg font-bold text-slate-800 mt-1">
                {summary.paid_invoices} / {summary.total_invoices}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-4">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setActiveTab("SETTLEMENT")}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "SETTLEMENT"
                ? "bg-brand-cyan text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            تسويات مسؤولي التحصيل
          </button>
          <button
            onClick={() => setActiveTab("EXPENSES")}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "EXPENSES"
                ? "bg-brand-cyan text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            مصروفات الاتحاد
          </button>
          <button
            onClick={() => setActiveTab("LEDGER")}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "LEDGER"
                ? "bg-brand-cyan text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            دفتر الاتحاد والإحصائيات
          </button>
          <button
            onClick={() => setActiveTab("LATE")}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "LATE"
                ? "bg-brand-cyan text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            السكان المتأخرين
          </button>
        </div>

        {/* ============ TAB 1: Admin Settlements ============ */}
        {activeTab === "SETTLEMENT" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  تسويات مسؤولي التحصيل
                </h1>
                <p className="text-sm text-slate-600">
                  استعرض أرصدة مسؤولي التحصيل وسجّل التسويات النقدية معهم.
                </p>
              </div>
            </div>

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Admin list */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-3 space-y-3">
                <h2 className="text-sm font-semibold text-slate-800 mb-1">
                  مسؤولو التحصيل
                </h2>
                {loadingAdmins && admins.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    جارٍ تحميل البيانات...
                  </p>
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
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-800">
                              {admin.full_name}
                            </div>
                            <div className="text-xs text-slate-600">
                              اسم المستخدم: {admin.username}
                            </div>
                          </div>

                          {admin.role === "ONLINE_ADMIN" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                              اونلاين
                            </span>
                          )}
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
                  ) : loadingAdmins && !details ? (
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
                                {details.summary.outstanding_amount.toFixed(2)}{" "}
                                جنيه).
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
                              disabled={savingSettlement}
                              className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                            >
                              {savingSettlement
                                ? "جارٍ الحفظ..."
                                : "تسجيل التسوية"}
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
          </>
        )}

        {/* ============ TAB 2: Expenses ============ */}
        {activeTab === "EXPENSES" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense form */}
            <div className="bg-white rounded-xl shadow-sm p-3 space-y-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                إضافة مصروف اتحاد جديد
              </h2>
              {expenseError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 mb-2">
                  {expenseError}
                </div>
              )}
              <form
                onSubmit={submitExpense}
                className="space-y-3 text-sm max-w-md"
              >
                <div>
                  <label className="block mb-1 text-slate-700">
                    المبلغ (جنيه)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded-lg px-3 py-2 text-right"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">
                    التصنيف (اختياري)
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-right"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    placeholder="مثال: نظافة، أمن، صيانة..."
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">
                    الوصف / البيان
                  </label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-right text-sm"
                    rows={2}
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="مثال: مصروف صيانة الأعمدة الكهربائية."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={expenseSaving}
                  className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {expenseSaving ? "جارٍ الحفظ..." : "تسجيل المصروف"}
                </button>
              </form>
            </div>

            {/* Expense list */}
            <div className="bg-white rounded-xl shadow-sm p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                آخر المصروفات المسجلة
              </h2>
              {expenses.length === 0 ? (
                <p className="text-sm text-slate-600">
                  لا توجد مصروفات مسجلة حتى الآن.
                </p>
              ) : (
                <div className="max-h-[40vh] overflow-y-auto pr-1 text-xs sm:text-sm">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b text-[11px] sm:text-xs text-slate-600">
                        <th className="py-1">التاريخ</th>
                        <th className="py-1">البيان</th>
                        <th className="py-1">التصنيف</th>
                        <th className="py-1">المبلغ</th>
                        <th className="py-1">مسجّل بواسطة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp) => (
                        <tr key={exp.id} className="border-b last:border-0">
                          <td className="py-1 align-top">{exp.date}</td>
                          <td className="py-1 align-top">{exp.description}</td>
                          <td className="py-1 align-top">
                            {exp.category || "-"}
                          </td>
                          <td className="py-1 align-top">
                            {exp.amount.toFixed(2)}
                          </td>
                          <td className="py-1 align-top">{exp.created_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ TAB 3: Ledger & Stats ============ */}
        {activeTab === "LEDGER" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                إحصائيات دفتر الاتحاد
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="text-xs text-slate-600">إجمالي الإيداعات</div>
                  <div className="text-lg font-bold text-green-700 mt-1">
                    {ledgerStats.totalCredit.toFixed(2)} جنيه
                  </div>
                </div>
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="text-xs text-slate-600">
                    إجمالي المصروفات (مدين)
                  </div>
                  <div className="text-lg font-bold text-red-700 mt-1">
                    {ledgerStats.totalDebit.toFixed(2)} جنيه
                  </div>
                </div>
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="text-xs text-slate-600">الرصيد الحالي</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {summary?.union_balance.toFixed(2) ?? "0.00"} جنيه
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                الرصيد الحالي يجب أن يساوي آخر قيمة (الرصيد بعد القيد) في
                القائمة بالأسفل.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                كل الحركات المالية (دفتر الاتحاد)
              </h2>
              {ledgerError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 mb-2">
                  {ledgerError}
                </div>
              )}
              {ledger.length === 0 ? (
                <p className="text-sm text-slate-600">
                  لا توجد قيود مالية مسجلة حتى الآن.
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 text-xs sm:text-sm">
                  {ledger.map((entry) => {
                    const isCredit = entry.credit > 0;
                    const amount = isCredit ? entry.credit : entry.debit;
                    return (
                      <div
                        key={entry.id}
                        className="border rounded-lg p-3 bg-slate-50 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">
                            {entry.date}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              isCredit
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {isCredit ? "+ إيداع" : "- مصروف"}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800">
                          {entry.description}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-700 mt-1">
                          <span>
                            المبلغ:{" "}
                            <span
                              className={
                                isCredit ? "text-green-700" : "text-red-700"
                              }
                            >
                              {isCredit
                                ? `+${amount.toFixed(2)}`
                                : `-${amount.toFixed(2)}`}{" "}
                              جنيه
                            </span>
                          </span>
                          <span>
                            الرصيد بعد القيد:{" "}
                            <span className="font-semibold text-slate-900">
                              {entry.balance_after.toFixed(2)} جنيه
                            </span>
                          </span>
                          <span>مسجّل بواسطة: {entry.created_by}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ TAB 4: Late Residents ============ */}
        {activeTab === "LATE" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 mb-1">
                  قائمة السكان المتأخرين عن السداد
                </h2>
                <p className="text-xs text-slate-600">
                  يظهر هنا أي ساكن:
                  {" "}
                  لم يدفع بعد اليوم الخامس من الشهر الحالي،
                  أو عليه مديونية لأكثر من ٣ أشهر،
                  أو قام بسداد جزئي فقط.
                </p>
                {lateToday && (
                  <p className="text-xs text-slate-500 mt-1">
                    تاريخ التقييم: {lateToday} – بعد اليوم رقم{" "}
                    {lateCutoff ?? 5} من كل شهر يتم اعتبار الشهر متأخر.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={loadLateResidents}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs sm:text-sm"
                >
                  تحديث القائمة
                </button>
                <button
                  onClick={printLateResidentsList}
                  className="px-3 py-2 rounded-lg bg-brand-cyan text-white text-xs sm:text-sm"
                >
                  طباعة / حفظ PDF
                </button>
                <button
                  onClick={handleNotifyAllLate}
                  disabled={notifyLoading}
                  className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs sm:text-sm disabled:opacity-60"
                >
                  {notifyLoading ? "جارٍ إرسال الإشعارات..." : "إرسال إشعارات للسكان المتأخرين"}
                </button>
              </div>
            </div>

            {lateError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {lateError}
              </div>
            )}

            {notifyMsg && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg p-2 mt-2">
                {notifyMsg}
              </div>
            )}
            {notifyError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 mt-2">
                {notifyError}
              </div>
            )}

            {lateLoading ? (
              <div className="bg-white rounded-xl shadow-sm p-3 text-sm text-slate-600">
                جارٍ تحميل قائمة السكان المتأخرين...
              </div>
            ) : lateResidents.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-3 text-sm text-green-700">
                لا يوجد سكان متأخرون حالياً. 👌
              </div>
            ) : (
              <div className="space-y-3">
                {lateResidents.map((r) => {
                  const flags: string[] = [];
                  if (r.status_flags.current_month_late)
                    flags.push("متأخر عن الشهر الحالي");
                  if (r.status_flags.more_than_3_months)
                    flags.push("مديونية أكثر من ٣ أشهر");
                  if (r.status_flags.partial_payments)
                    flags.push("سداد جزئي");

                  return (
                    <div
                      key={r.user_id}
                      className="bg-white rounded-xl shadow-sm p-3 flex flex-col gap-2"
                    >
                      <div className="flex flex-col sm:flex-row justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-800">
                            {r.full_name}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            عمارة {r.building ?? "-"} – دور {r.floor ?? "-"} – شقة{" "}
                            {r.apartment ?? "-"}
                          </div>
                          {r.phone && (
                            <div className="text-xs text-slate-600 mt-1">
                              رقم الموبايل: {r.phone}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-right">
                          <div className="text-xs text-slate-600">إجمالي المديونية</div>
                          <div className="text-lg font-bold text-red-700">
                            {r.total_overdue_amount.toFixed(2)} جنيه
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs mt-1">
                        {flags.map((f) => (
                          <span
                            key={f}
                            className="px-2 py-1 rounded-full bg-orange-100 text-orange-800"
                          >
                            {f}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2 border-t pt-2 text-[11px] sm:text-xs text-slate-700">
                        <div className="font-semibold mb-1">
                          الأشهر المتأخرة:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {r.overdue_months.map((m, idx) => (
                            <div
                              key={`${r.user_id}-${m.year}-${m.month}-${idx}`}
                              className="border rounded-lg px-2 py-1 bg-slate-50"
                            >
                              <div>
                                {m.month}/{m.year}
                              </div>
                              <div>
                                المبلغ: {m.amount.toFixed(2)} – المدفوع:{" "}
                                {m.paid_amount.toFixed(2)} – الباقي:{" "}
                                {m.unpaid_amount.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {r.phone && (
                          <a
                            href={buildWhatsAppLink(r)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs"
                          >
                            إرسال تذكير عبر واتساب
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
