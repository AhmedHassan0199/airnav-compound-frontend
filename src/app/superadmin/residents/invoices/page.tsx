"use client";

import { useEffect, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { useRequireAuth } from "@/lib/auth";
import {
  adminSearchResidents,
  adminGetResidentInvoices,
  superadminUpdateInvoiceStatus,
} from "@/lib/api";
import { formatDateTime } from "@/lib/dateFormat";

type ResidentSearchItem = {
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

function sortInvoicesForDisplay(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => {
    const aPaid = a.status === "PAID";
    const bPaid = b.status === "PAID";

    if (aPaid !== bPaid) {
      return aPaid ? 1 : -1;
    }
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return a.month - b.month;
  });
}

export default function SuperadminResidentInvoicesPage() {
  const { user, loading: authLoading } = useRequireAuth(["SUPERADMIN"]);

  const [buildingFilter, setBuildingFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [apartmentFilter, setApartmentFilter] = useState("");

  const [residents, setResidents] = useState<ResidentSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedResident, setSelectedResident] =
    useState<ResidentSearchItem | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();

    try {
      setSearchError(null);
      setSearchLoading(true);

      const token = localStorage.getItem("access_token");
      if (!token) {
        setSearchError("لم يتم العثور على جلسة تسجيل الدخول");
        setSearchLoading(false);
        return;
      }

      const filters: any = {};
      if (buildingFilter.trim()) filters.building = buildingFilter.trim();
      if (floorFilter.trim()) filters.floor = floorFilter.trim();
      if (apartmentFilter.trim()) filters.apartment = apartmentFilter.trim();

      const data = await adminSearchResidents(token, filters);
      setResidents(data);
    } catch (err: any) {
      setSearchError(err.message || "حدث خطأ أثناء تحميل قائمة السكان");
    } finally {
      setSearchLoading(false);
    }
  }

  async function loadResidentInvoices(res: ResidentSearchItem) {
    setSelectedResident(res);
    setInvoices([]);
    setInvoicesError(null);

    try {
      setInvoicesLoading(true);
      const token = localStorage.getItem("access_token");
      if (!token) {
        setInvoicesError("لم يتم العثور على جلسة تسجيل الدخول");
        setInvoicesLoading(false);
        return;
      }

      const invResp = await adminGetResidentInvoices(token, res.id);
      const sorted = sortInvoicesForDisplay(invResp.invoices || []);
      setInvoices(sorted);
    } catch (err: any) {
      setInvoicesError(err.message || "تعذر تحميل الفواتير");
    } finally {
      setInvoicesLoading(false);
    }
  }

  async function handleChangeInvoiceStatus(
    invoice: Invoice,
    newStatus: string
  ) {
    if (!selectedResident) return;

    const confirmMsg = `هل أنت متأكد من تغيير حالة الفاتورة لشهر ${invoice.month}/${invoice.year} إلى: ${newStatus}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setStatusSavingId(invoice.id);
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("لم يتم العثور على جلسة تسجيل الدخول");
        setStatusSavingId(null);
        return;
      }

      await superadminUpdateInvoiceStatus(token, invoice.id, {
        status: newStatus,
      });

      const invResp = await adminGetResidentInvoices(token, selectedResident.id);
      const sorted = sortInvoicesForDisplay(invResp.invoices || []);
      setInvoices(sorted);
    } catch (err: any) {
      alert(err.message || "تعذر تحديث حالة الفاتورة");
    } finally {
      setStatusSavingId(null);
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

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="تعديل حالة فواتير ساكن (المشرف العام)" />
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
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
          <button
            type="submit"
            className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold hover:bg-brand-cyan/90 disabled:opacity-60"
            disabled={searchLoading}
          >
            {searchLoading ? "جارٍ البحث..." : "بحث"}
          </button>
        </form>

        {searchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {searchError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Residents list */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-3 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">
              قائمة السكان
            </h2>
            {searchLoading && residents.length === 0 ? (
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
                    onClick={() => loadResidentInvoices(res)}
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

          {/* Invoices editor */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              تعديل حالة الفواتير
            </h2>

            {!selectedResident ? (
              <p className="text-sm text-slate-600">
                اختر ساكناً من القائمة لعرض فواتيره.
              </p>
            ) : invoicesLoading && invoices.length === 0 ? (
              <p className="text-sm text-slate-600">جارٍ تحميل الفواتير...</p>
            ) : invoicesError ? (
              <p className="text-sm text-red-600">{invoicesError}</p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-slate-600">
                لا توجد فواتير مسجلة لهذا الساكن.
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 text-sm">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="border rounded-lg p-3 bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-800">
                        شهر {inv.month}/{inv.year}
                      </div>
                      <div className="text-xs text-slate-600">
                        المبلغ:{" "}
                        <span className="font-semibold">
                          {inv.amount.toFixed(2)} جنيه
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs text-slate-700">
                      <div>
                        <span className="text-slate-600">الاستحقاق:</span>{" "}
                        {inv.due_date ? formatDateTime(inv.due_date) : "-"}
                      </div>
                      <div>
                        <span className="text-slate-600">السداد:</span>{" "}
                        {inv.paid_date ? formatDateTime(inv.paid_date) : "-"}
                      </div>
                      <div>
                        <span className="text-slate-600">الحالة الحالية:</span>{" "}
                        {inv.status}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <select
                        className="border rounded-lg px-3 py-1 text-xs text-right"
                        defaultValue={inv.status}
                        onChange={(e) =>
                          handleChangeInvoiceStatus(inv, e.target.value)
                        }
                        disabled={statusSavingId === inv.id}
                      >
                        <option value="UNPAID">UNPAID</option>
                        <option value="PAID">PAID</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="PENDING">PENDING</option>
                        <option value="PENDING_CONFIRMATION">
                          PENDING_CONFIRMATION
                        </option>
                      </select>
                      {statusSavingId === inv.id && (
                        <span className="text-xs text-slate-500">
                          جارٍ حفظ الحالة...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
