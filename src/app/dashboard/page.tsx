"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { formatDateTime } from "@/lib/dateFormat";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import {
  adminSearchResidents,
  adminGetResidentInvoices,
  adminCollectPayment,
  adminCreateInvoice,
  adminDeleteInvoice,
  adminGetMySummary,
  adminGetOnlinePaymentsPending,
  adminActOnOnlinePayment,
} from "@/lib/api";

type Resident = {
  id: number;
  username: string;
  role: string;
  person: {
    full_name: string;
    building: string;
    floor: string;
    apartment: string;
  };
  unpaid_invoices_count: number;
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

type OnlinePaymentItem = {
  id: number;
  invoice_id: number;
  invoice_status: string;
  year: number;
  month: number;
  amount: number;
  resident_id: number;
  resident_username: string;
  resident_name: string | null;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  instapay_sender_id: string;
  transaction_ref: string;
  created_at: string;
};

function sortInvoicesForDisplay(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => {
    const aPaid = a.status === "PAID";
    const bPaid = b.status === "PAID";

    // Unpaid first, then paid
    if (aPaid !== bPaid) {
      return aPaid ? 1 : -1;
    }

    // Inside each group, sort by year then month ascending
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return a.month - b.month;
  });
}

export default function AdminDashboardPage() {
  // SUPERADMIN will also come here later, but for now:
  const { user, loading: authLoading } = useRequireAuth([
    "ADMIN",
    "SUPERADMIN",
    "ONLINE_ADMIN",
  ]);

  const [buildingFilter, setBuildingFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [apartmentFilter, setApartmentFilter] = useState("");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment form state
  const [collectingInvoice, setCollectingInvoice] = useState<Invoice | null>(
    null
  );
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // New invoice form state
  const [newMonth, setNewMonth] = useState<string>("");
  const [newYear, setNewYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [newAmount, setNewAmount] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [newSaving, setNewSaving] = useState(false);

  // Online payments state
  const [onlinePayments, setOnlinePayments] = useState<OnlinePaymentItem[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineActionLoadingId, setOnlineActionLoadingId] = useState<
    number | null
  >(null);
  const [onlineLoadedOnce, setOnlineLoadedOnce] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "collect" | "view" | "profile" | "online"
  >("collect");
  const [tabInitialized, setTabInitialized] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !tabInitialized) {
      if (user.role === "ONLINE_ADMIN") {
        setActiveTab("online");
        loadOnlinePayments();
      } else {
        setActiveTab("collect");
      }
      setTabInitialized(true);
    }
  }, [authLoading, user, tabInitialized]);

  // Admin profile summary
  const [profile, setProfile] = useState<{
    total_amount: number;
    payments_count: number;
    today_amount: number;
    today_count: number;
    settled_amount: number;
    outstanding_amount: number;
    recent_payments: {
      id: number;
      amount: number;
      created_at: string;
      resident_name: string;
      building: string;
      floor: string;
      apartment: string;
      year: number;
      month: number;
    }[];
  } | null>(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Load initial residents
  useEffect(() => {
    if (authLoading) return;
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("لم يتم العثور على جلسة تسجيل الدخول");
      return;
    }

    loadResidents();
  }, [authLoading]);

  type ResidentFilters = {
    building?: string;
    floor?: string;
    apartment?: string;
  };

  async function loadResidents(filters?: ResidentFilters) {
    const token = localStorage.getItem("access_token");
    const data = await adminSearchResidents(token, filters || {});
    setResidents(data);
  }

  function handleSearchClick() {
    const filters: ResidentFilters = {};
    if (buildingFilter.trim()) filters.building = buildingFilter.trim();
    if (floorFilter.trim()) filters.floor = floorFilter.trim();
    if (apartmentFilter.trim()) filters.apartment = apartmentFilter.trim();
    loadResidents(filters);
  }

  async function loadOnlinePayments() {
    try {
      setOnlineError(null);
      setOnlineLoading(true);
      const token = localStorage.getItem("access_token");
      const data = await adminGetOnlinePaymentsPending(token);
      setOnlinePayments(data);
      setOnlineLoadedOnce(true);
    } catch (err: any) {
      setOnlineError(
        err.message || "حدث خطأ أثناء تحميل المدفوعات الإلكترونية المعلقة"
      );
    } finally {
      setOnlineLoading(false);
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();

    await loadResidents({
      building: buildingFilter.trim(),
      floor: floorFilter.trim(),
      apartment: apartmentFilter.trim(),
    });
  }

  async function handleOnlineAction(id: number, action: "approve" | "reject") {
    const confirmText =
      action === "approve"
        ? "هل أنت متأكد من اعتماد هذه العملية واعتبار الفاتورة مسددة؟"
        : "هل أنت متأكد من رفض هذه العملية؟ سيتم إعادة الفاتورة كغير مسددة.";

    if (!window.confirm(confirmText)) return;

    try {
      setOnlineActionLoadingId(id);
      const token = localStorage.getItem("access_token");
      await adminActOnOnlinePayment(token, id, action, {});
      await loadOnlinePayments();
    } catch (err: any) {
      alert(err.message || "تعذر تنفيذ العملية على الدفع الإلكتروني");
    } finally {
      setOnlineActionLoadingId(null);
    }
  }

  async function handleSelectResident(res: Resident) {
    setSelectedResident(res);
    setInvoices([]);
    setCollectingInvoice(null);
    setAmount("");
    setNotes("");

    try {
      setError(null);
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const data = await adminGetResidentInvoices(token, res.id);
      const sorted = sortInvoicesForDisplay(data.invoices || []);
      setInvoices(sorted);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل الايصالات");
    } finally {
      setLoading(false);
    }
  }

  async function downloadInvoicePdf(inv: Invoice, residentName: string) {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("برجاء تسجيل الدخول مرة أخرى.");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/resident/invoices/${inv.id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "تعذر تحميل ملف الفاتورة.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `فاتورة-صيانة-${inv.year}-${inv.month}-${residentName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("حدث خطأ أثناء تحميل الفاتورة.");
    }
  }

  async function loadProfile() {
    try {
      setProfileError(null);
      setProfileLoading(true);
      const token = localStorage.getItem("access_token");
      const data = await adminGetMySummary(token);
      setProfile(data);
    } catch (err: any) {
      setProfileError(err.message || "حدث خطأ أثناء تحميل بيانات المسؤول");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleDeleteInvoice(inv: Invoice) {
    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف ايصال شهر ${inv.month}/${inv.year}؟`
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("access_token");
      await adminDeleteInvoice(token, inv.id);

      if (selectedResident) {
        const data = await adminGetResidentInvoices(token, selectedResident.id);
        const sorted = sortInvoicesForDisplay(data.invoices || []);
        setInvoices(sorted);
      }

      if (collectingInvoice && collectingInvoice.id === inv.id) {
        setCollectingInvoice(null);
        setAmount("");
        setNotes("");
      }
    } catch (err: any) {
      alert(err.message || "تعذر حذف الايصال");
    }
  }

  async function submitNewInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedResident) {
      alert("برجاء اختيار ساكن أولاً قبل إنشاء ايصال.");
      return;
    }
    if (!newMonth || !newYear || !newAmount) {
      alert("برجاء إدخال الشهر والسنة وقيمة الايصال.");
      return;
    }

    try {
      setNewSaving(true);
      const token = localStorage.getItem("access_token");

      await adminCreateInvoice(token, {
        user_id: selectedResident.id,
        year: parseInt(newYear, 10),
        month: parseInt(newMonth, 10),
        amount: parseFloat(newAmount),
        due_date: newDueDate || undefined,
        notes: newNotes || undefined,
      });

      const data = await adminGetResidentInvoices(token, selectedResident.id);
      const sorted = sortInvoicesForDisplay(data.invoices || []);
      setInvoices(sorted);

      setNewAmount("");
      setNewDueDate("");
      setNewNotes("");
      // keep month/year to speed repeated creation
    } catch (err: any) {
      alert(err.message || "تعذر إنشاء الايصال");
    } finally {
      setNewSaving(false);
    }
  }

  function startCollect(inv: Invoice) {
    setCollectingInvoice(inv);
    setAmount(inv.amount.toFixed(2));
    setNotes("");
  }

  async function submitCollect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedResident || !collectingInvoice) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("access_token");
      await adminCollectPayment(token, {
        user_id: selectedResident.id,
        invoice_id: collectingInvoice.id,
        amount: collectingInvoice.amount,
        method: "CASH",
        notes: notes || undefined,
      });

      const data = await adminGetResidentInvoices(token, selectedResident.id);
      const sorted = sortInvoicesForDisplay(data.invoices || []);
      setInvoices(sorted);
      setCollectingInvoice(null);
      setAmount("");
      setNotes("");
    } catch (err: any) {
      alert(err.message || "تعذر تسجيل التحصيل");
    } finally {
      setSaving(false);
    }
  }

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

  // simple placeholder for SUPERADMIN for now
  if (user && user.role === "SUPERADMIN") {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-brand-beige"
        dir="rtl"
      >
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg w-full text-center">
          <h1 className="text-lg font-bold text-slate-800 mb-2">
            لوحة تحكم المشرف العام
          </h1>
          <p className="text-sm text-slate-600">
            سيتم إضافة لوحة تحكم المشرف العام (إحصائيات وتحليلات) لاحقاً.
          </p>
        </div>
      </main>
    );
  }

  // Admin / Online Admin view
  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="لوحة تحكم مسؤول التحصيل" />
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              لوحة تحصيل الصيانة (الإدارة)
            </h1>
            <p className="text-sm text-slate-600">
              ابحث عن السكان، استعرض الايصالات، وسجّل التحصيلات النقدية.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-1">
          {/* ✅ Now visible for ALL admins, including ONLINE_ADMIN */}
          <button
            onClick={() => setActiveTab("collect")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              activeTab === "collect"
                ? "bg-brand-cyan text-white"
                : "bg-white text-slate-700 border border-slate-200"
            }`}
          >
            تحصيل الصيانة
          </button>
          <button
            onClick={() => setActiveTab("view")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              activeTab === "view"
                ? "bg-brand-cyan text-white"
                : "bg-white text-slate-700 border border-slate-200"
            }`}
          >
            عرض الفواتير وطباعتها
          </button>
          <button
            onClick={async () => {
              setActiveTab("profile");
              if (!profile) {
                await loadProfile();
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              activeTab === "profile"
                ? "bg-brand-cyan text-white"
                : "bg-white text-slate-700 border border-slate-200"
            }`}
          >
            ملفي كمسؤول تحصيل
          </button>
          {user?.role === "ONLINE_ADMIN" && (
            <button
              onClick={async () => {
                setActiveTab("online");
                if (!onlineLoadedOnce) {
                  await loadOnlinePayments();
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                activeTab === "online"
                  ? "bg-brand-cyan text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              مدفوعات إنستا باي
            </button>
          )}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          {/* Building */}
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              المبنى
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              placeholder="مثال: 10"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            />
          </div>

          {/* Floor */}
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              الدور
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              placeholder="مثال: 4"
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
            />
          </div>

          {/* Apartment */}
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              الشقة
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              placeholder="مثال: 12"
              value={apartmentFilter}
              onChange={(e) => setApartmentFilter(e.target.value)}
            />
          </div>

          {/* Search button */}
          <button
            type="button"
            onClick={handleSearchClick}
            className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold hover:bg-brand-cyan/90"
          >
            بحث
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Layout: Residents list + Invoices panel */}
        {activeTab === "collect" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Residents column */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-3 space-y-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                قائمة السكان
              </h2>
              {loading && residents.length === 0 ? (
                <p className="text-sm text-slate-600">جارٍ تحميل السكان...</p>
              ) : residents.length === 0 ? (
                <p className="text-sm text-slate-600">
                  لا توجد نتائج. جرّب تعديل بيانات البحث.
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {residents.map((res) => (
                    <button
                      key={res.id}
                      className={`w-full text-right border rounded-lg p-3 text-sm hover:bg-slate-50 transition ${
                        selectedResident?.id === res.id
                          ? "border-brand-cyan bg-slate-50"
                          : "border-slate-200"
                      }`}
                      onClick={() => handleSelectResident(res)}
                    >
                      <div className="font-semibold text-slate-800">
                        {res.person.full_name}
                      </div>
                      <div className="text-xs text-slate-600">
                        مبنى {res.person.building} – دور {res.person.floor} – شقة{" "}
                        {res.person.apartment}
                      </div>
                      <div className="text-xs mt-1">
                        <span
                          className={
                            res.unpaid_invoices_count > 0
                              ? "text-red-600 font-semibold"
                              : "text-green-600"
                          }
                        >
                          {res.unpaid_invoices_count > 0
                            ? `${res.unpaid_invoices_count}  ايصالات غير مسدد`
                            : "لا توجد  ايصالات مستحقة"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices + Collect form */}
            <div className="lg:col-span-2 space-y-3">
              {/* Invoices */}
              <div className="bg-white rounded-xl shadow-sm p-3">
                <h2 className="text-sm font-semibold text-slate-800 mb-2">
                  ايصالات الساكن
                </h2>
                {!selectedResident ? (
                  <p className="text-sm text-slate-600">
                    اختر ساكناً من القائمة على اليمين لعرض  ايصالاته.
                  </p>
                ) : loading && invoices.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    جارٍ تحميل  ايصالات {selectedResident.person.full_name}...
                  </p>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    لا توجد  ايصالات مسجلة لهذا الساكن.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {invoices.map((inv) => {
                      const isPaid = inv.status === "PAID";
                      const isOverdue = inv.status === "OVERDUE";
                      const isPendingConfirmation =
                        inv.status === "PENDING_CONFIRMATION";

                      return (
                        <div
                          key={inv.id}
                          className="border rounded-lg p-3 text-sm bg-slate-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-800">
                              شهر {inv.month}/{inv.year}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                isPaid
                                  ? "bg-green-100 text-green-700"
                                  : isPendingConfirmation
                                  ? "bg-blue-100 text-blue-700"
                                  : isOverdue
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {isPaid
                                ? "مسدد"
                                : isPendingConfirmation
                                ? "في انتظار تأكيد الدفع"
                                : isOverdue
                                ? "متأخرة"
                                : "غير مسدد"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <span>القيمة:</span>
                            <span className="font-semibold">
                              {inv.amount.toFixed(2)} جنيه
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                            <span>الاستحقاق:</span>
                            <span>{formatDateTime(inv.due_date) || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>السداد:</span>
                            <span>{formatDateTime(inv.paid_date) || "-"}</span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {!isPaid && !isPendingConfirmation && (
                              <button
                                onClick={() => startCollect(inv)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-brand-cyan text-white hover:opacity-90"
                              >
                                تسجيل تحصيل هذا الايصال
                              </button>
                            )}
                            {!isPaid && !isPendingConfirmation && (
                              <button
                                onClick={() => handleDeleteInvoice(inv)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 border border-red-200 hover:bg-red-50"
                              >
                                حذف الايصال
                              </button>
                            )}
                            {isPendingConfirmation && (
                              <p className="text-[11px] text-slate-600">
                                يوجد طلب دفع إلكتروني قيد المراجعة لهذا الايصال، لا
                                يمكن تعديله من هنا.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Collect form */}
              <div className="bg-white rounded-xl shadow-sm p-3">
                <h2 className="text-sm font-semibold text-slate-800 mb-2">
                  تسجيل تحصيل نقدي
                </h2>
                {!selectedResident || !collectingInvoice ? (
                  <p className="text-sm text-slate-600">
                    اختر ساكناً، ثم اختر ايصال غير مسدد لتسجيل التحصيل.
                  </p>
                ) : (
                  <form
                    onSubmit={submitCollect}
                    className="space-y-3 text-sm max-w-md"
                  >
                    <div>
                      <div className="text-slate-700">
                        الساكن:{" "}
                        <span className="font-semibold">
                          {selectedResident.person.full_name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        ايصال شهر {collectingInvoice.month}/
                        {collectingInvoice.year}
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-700">
                        المبلغ المحصل (جنيه)
                      </label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 text-right bg-slate-100 cursor-not-allowed"
                        value={
                          collectingInvoice
                            ? collectingInvoice.amount.toFixed(2)
                            : ""
                        }
                        readOnly
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        قيمة الفاتورة ثابتة ولا يمكن تعديلها من شاشة التحصيل.
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
                        placeholder="مثال: تم التحصيل نقداً بواسطة مسؤول البوابة."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                    >
                      {saving
                        ? "جارٍ الحفظ..."
                        : "تسجيل التحصيل واعتبار الايصال مسدد"}
                    </button>
                  </form>
                )}
              </div>

              {/* New invoice form */}
              <div className="bg-white rounded-xl shadow-sm p-3">
                <h2 className="text-sm font-semibold text-slate-800 mb-2">
                  إنشاء ايصال صيانة جديدة
                </h2>
                {!selectedResident ? (
                  <p className="text-sm text-slate-600">
                    اختر ساكناً من القائمة لإنشاء ايصال جديدة له.
                  </p>
                ) : (
                  <form
                    onSubmit={submitNewInvoice}
                    className="space-y-3 text-sm max-w-md"
                  >
                    <div className="text-slate-700">
                      الساكن:{" "}
                      <span className="font-semibold">
                        {selectedResident.person.full_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-slate-700">
                          شهر الايصال
                        </label>
                        <select
                          className="w-full border rounded-lg px-3 py-2 text-right"
                          value={newMonth}
                          onChange={(e) => setNewMonth(e.target.value)}
                          required
                        >
                          <option value="">اختر الشهر</option>
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
                      <div>
                        <label className="block mb-1 text-slate-700">
                          سنة الايصال
                        </label>
                        <input
                          type="number"
                          className="w-full border rounded-lg px-3 py-2 text-right"
                          value={newYear}
                          onChange={(e) => setNewYear(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-700">
                        قيمة الايصال (جنيه)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full border rounded-lg px-3 py-2 text-right"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-700">
                        تاريخ الاستحقاق
                      </label>
                      <input
                        type="date"
                        className="w-full border rounded-lg px-3 py-2 text-right"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-700">
                        ملاحظات (اختياري)
                      </label>
                      <textarea
                        className="w-full border rounded-lg px-3 py-2 text-right text-sm"
                        rows={2}
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="مثال: قيمة الصيانة لهذا الشهر بعد زيادة الجمعية."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={newSaving}
                      className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                    >
                      {newSaving ? "جارٍ الحفظ..." : "إنشاء الايصال"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "view" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Residents column */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-3 space-y-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                قائمة السكان
              </h2>
              {loading && residents.length === 0 ? (
                <p className="text-sm text-slate-600">جارٍ تحميل السكان...</p>
              ) : residents.length === 0 ? (
                <p className="text-sm text-slate-600">
                  لا توجد نتائج. جرّب تعديل بيانات البحث.
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {residents.map((res) => (
                    <button
                      key={res.id}
                      className={`w-full text-right border rounded-lg p-3 text-sm hover:bg-slate-50 transition ${
                        selectedResident?.id === res.id
                          ? "border-brand-cyan bg-slate-50"
                          : "border-slate-200"
                      }`}
                      onClick={() => handleSelectResident(res)}
                    >
                      <div className="font-semibold text-slate-800">
                        {res.person.full_name}
                      </div>
                      <div className="text-xs text-slate-600">
                        مبنى {res.person.building} – دور {res.person.floor} – شقة{" "}
                        {res.person.apartment}
                      </div>
                      <div className="text-xs mt-1 text-slate-600">
                        اسم المستخدم: {res.username}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices view-only + PDF */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                فواتير الساكن (للعرض والطباعه)
              </h2>
              {!selectedResident ? (
                <p className="text-sm text-slate-600">
                  اختر ساكناً من القائمة لعرض فواتيره.
                </p>
              ) : loading && invoices.length === 0 ? (
                <p className="text-sm text-slate-600">
                  جارٍ تحميل فواتير {selectedResident.person.full_name}...
                </p>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-slate-600">
                  لا توجد فواتير مسجلة لهذا الساكن.
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {invoices.map((inv) => {
                    const isPaid = inv.status === "PAID";
                    const isOverdue = inv.status === "OVERDUE";
                    const isPendingConfirmation =
                      inv.status === "PENDING_CONFIRMATION";
                    return (
                      <div
                        key={inv.id}
                        className="border rounded-lg p-3 text-sm bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-slate-800">
                            شهر {inv.month}/{inv.year}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              isPaid
                                ? "bg-green-100 text-green-700"
                                : isPendingConfirmation
                                ? "bg-blue-100 text-blue-700"
                                : isOverdue
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {isPaid
                              ? "مسددة"
                              : isPendingConfirmation
                              ? "في انتظار تأكيد الدفع"
                              : isOverdue
                              ? "متأخرة"
                              : "غير مسددة"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span>القيمة:</span>
                          <span className="font-semibold">
                            {inv.amount.toFixed(2)} جنيه
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                          <span>الاستحقاق:</span>
                          <span>{formatDateTime(inv.due_date) || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>السداد:</span>
                          <span>{formatDateTime(inv.paid_date) || "-"}</span>
                        </div>

                        {isPaid && selectedResident && (
                          <button
                            onClick={() =>
                              downloadInvoicePdf(
                                inv,
                                selectedResident.person.full_name
                              )
                            }
                            className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-brand-cyan text-white hover:opacity-90"
                          >
                            طباعة / تحميل الفاتورة PDF
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                ملخص مسؤول التحصيل
              </h2>

              {profileLoading && (
                <p className="text-sm text-slate-600">جارٍ تحميل البيانات...</p>
              )}
              {profileError && (
                <p className="text-sm text-red-600">{profileError}</p>
              )}

              {profile && !profileLoading && !profileError && (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-xs text-slate-600">
                        إجمالي المبالغ المحصلة
                      </div>
                      <div className="text-lg font-bold text-slate-800 mt-1">
                        {profile.total_amount.toFixed(2)} جنيه
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-xs text-slate-600">
                        المبالغ المسددة للخزينة
                      </div>
                      <div className="text-lg font-bold text-slate-800 mt-1">
                        {profile.settled_amount.toFixed(2)} جنيه
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-xs text-slate-600">
                        الرصيد المطلوب تسويته
                      </div>
                      <div className="text-lg font-bold mt-1 text-orange-700">
                        {profile.outstanding_amount.toFixed(2)} جنيه
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-slate-50">
                      <div className="text-xs text-slate-600">
                        عدد الفواتير المحصلة
                      </div>
                      <div className="text-lg font-bold text-slate-800 mt-1">
                        {profile.payments_count}
                      </div>
                    </div>
                  </div>

                  {/* Recent payments */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">
                      آخر التحصيلات
                    </h3>
                    {profile.recent_payments.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        لا توجد تحصيلات مسجلة حتى الآن.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 text-sm">
                        {profile.recent_payments.map((p) => (
                          <div
                            key={p.id}
                            className="border rounded-lg p-3 bg-slate-50"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {p.resident_name}
                              </span>
                              <span className="text-xs text-slate-600">
                                {formatDateTime(p.created_at)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              مبنى {p.building} – دور {p.floor} – شقة {p.apartment}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span>
                                فاتورة شهر {p.month}/{p.year}
                              </span>
                              <span className="font-semibold">
                                {p.amount.toFixed(2)} جنيه
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "online" && user?.role === "ONLINE_ADMIN" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                المدفوعات الإلكترونية (إنستا باي) قيد المراجعة
              </h2>

              {onlineLoading && (
                <p className="text-sm text-slate-600">جارٍ تحميل البيانات...</p>
              )}

              {onlineError && (
                <p className="text-sm text-red-600 mb-2">{onlineError}</p>
              )}

              {!onlineLoading &&
                onlinePayments.length === 0 &&
                !onlineError && (
                  <p className="text-sm text-slate-600">
                    لا توجد مدفوعات إلكترونية معلقة حالياً.
                  </p>
                )}

              {!onlineLoading && onlinePayments.length > 0 && (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 text-sm">
                  {onlinePayments.map((op) => (
                    <div
                      key={op.id}
                      className="border rounded-lg p-3 bg-slate-50 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-800">
                            {op.resident_name || op.resident_username}
                          </div>
                          <div className="text-xs text-slate-600">
                            مبنى {op.building} – دور {op.floor} – شقة {op.apartment}
                          </div>
                        </div>
                        <div className="text-xs text-slate-600 text-left">
                          <div>تاريخ الطلب:</div>
                          <div>{formatDateTime(op.created_at)}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700">
                        <div>
                          <div className="text-slate-600">الفاتورة:</div>
                          <div>
                            شهر {op.month}/{op.year}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-600">المبلغ:</div>
                          <div className="font-semibold">
                            {op.amount.toFixed(2)} جنيه
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-600">حالة الفاتورة:</div>
                          <div>{op.invoice_status}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 mt-1">
                        <div>
                          <div className="text-slate-600">
                            حساب/موبايل المرسل:
                          </div>
                          <div>{op.instapay_sender_id}</div>
                        </div>
                        <div>
                          <div className="text-slate-600">
                            رقم العملية (Transaction Ref):
                          </div>
                          <div>{op.transaction_ref}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleOnlineAction(op.id, "reject")}
                          disabled={onlineActionLoadingId === op.id}
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 border border-red-200 text-xs hover:bg-red-50 disabled:opacity-60"
                        >
                          {onlineActionLoadingId === op.id && "جاري التنفيذ..."}
                          {onlineActionLoadingId !== op.id && "رفض العملية"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOnlineAction(op.id, "approve")}
                          disabled={onlineActionLoadingId === op.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:opacity-90 disabled:opacity-60"
                        >
                          {onlineActionLoadingId === op.id && "جاري التنفيذ..."}
                          {onlineActionLoadingId !== op.id &&
                            "اعتماد العملية واعتبار الفاتورة مسددة"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
