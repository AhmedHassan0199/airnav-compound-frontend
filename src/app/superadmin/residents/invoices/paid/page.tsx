"use client";

import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { useRequireAuth } from "@/lib/auth";
import {
  superadminGetPaidInvoicesForMonth,
  superadminDownloadPaidInvoicesPdf,
} from "@/lib/api";

type PaidInvoiceRow = {
  invoice_id: number;
  resident_name: string;
  building: string;
  floor: string;
  apartment: string;
  payment_date: string; // ISO string
  payment_type: "CASH" | "ONLINE"; // ONLINE = Instapay
};

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    // fallback لو السيرفر مرجع فورمات تاني
    return value.split("T")[0] || value;
  } catch {
    return value;
  }
}

export default function SuperadminPaidInvoicesPage() {
  const { user, loading: authLoading } = useRequireAuth(["SUPERADMIN"]);

  const now = new Date();
  const [year, setYear] = useState<string>(now.getFullYear().toString());
  const [month, setMonth] = useState<string>("");

  const [rows, setRows] = useState<PaidInvoiceRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSearchError(null);
    setPdfError(null);

    if (!year.trim() || !month.trim()) {
      setSearchError("برجاء اختيار السنة والشهر أولاً.");
      return;
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || yearNum < 2000) {
      setSearchError("السنة غير صالحة.");
      return;
    }
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      setSearchError("الشهر غير صالح.");
      return;
    }

    try {
      setSearchLoading(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;

      if (!token) {
        setSearchError("لم يتم العثور على جلسة تسجيل الدخول.");
        setSearchLoading(false);
        return;
      }

      const data = await superadminGetPaidInvoicesForMonth(token, {
        year: yearNum,
        month: monthNum,
      });

      console.log("paid invoices API response:", data);

      // 🔐 Normalization: ندور على الـ Array جوه data.rows أو data.items أو data نفسها
      let normalized: PaidInvoiceRow[] = [];

      if (Array.isArray(data)) {
        normalized = data as PaidInvoiceRow[];
      } else if (Array.isArray((data as any).rows)) {
        normalized = (data as any).rows as PaidInvoiceRow[];
      } else if (Array.isArray((data as any).items)) {
        normalized = (data as any).items as PaidInvoiceRow[];
      }

      setRows(normalized);
    } catch (err: any) {
      setSearchError(
        err?.message || "حدث خطأ أثناء تحميل الفواتير المسددة."
      );
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleDownloadPdf() {
    setPdfError(null);

    if (!year.trim() || !month.trim()) {
      setPdfError("برجاء اختيار السنة والشهر أولاً.");
      return;
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum)) {
      setPdfError("برجاء التأكد من إدخال سنة وشهر صالحين.");
      return;
    }

    try {
      setPdfLoading(true);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;

      if (!token) {
        setPdfError("لم يتم العثور على جلسة تسجيل الدخول.");
        setPdfLoading(false);
        return;
      }

      const blob = await superadminDownloadPaidInvoicesPdf(token, {
        year: yearNum,
        month: monthNum,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `paid_invoices_${yearNum}_${monthNum}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setPdfError(
        err?.message || "تعذر تحميل ملف الـ PDF الخاص بالفواتير المسددة."
      );
    } finally {
      setPdfLoading(false);
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

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="تقرير الفواتير المسددة لشهر معين (المشرف العام)" />
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Filters */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-end"
        >
          <div className="flex-1">
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              سنة الفواتير
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min={2000}
            />
          </div>

          <div className="flex-1">
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              شهر الفواتير
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
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

          <button
            type="submit"
            className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold hover:bg-brand-cyan/90 disabled:opacity-60"
            disabled={searchLoading}
          >
            {searchLoading ? "جارٍ التحميل..." : "عرض الفواتير المسددة"}
          </button>
        </form>

        {(searchError || pdfError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {searchError || pdfError}
          </div>
        )}

        {/* Table + PDF button */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">
              قائمة الفواتير المسددة
            </h2>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfLoading || rows.length === 0}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-slate-900"
            >
              {pdfLoading ? "جارٍ إنشاء ملف PDF..." : "تحميل التقرير PDF"}
            </button>
          </div>

          {rows.length === 0 && !searchLoading ? (
            <p className="text-sm text-slate-600">
              لا توجد فواتير مسددة للشهر المحدد حتى الآن.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-200 px-2 py-1 text-center">
                      مسلسل
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-center">
                      الاسم
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-center">
                      المبنى
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-center">
                      الدور
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-center">
                      الشقة
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-center">
                      تاريخ السداد
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-center">
                      نوع الفاتورة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.invoice_id}>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-right">
                        {row.resident_name}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {row.building}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {row.floor}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {row.apartment}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {formatDateOnly(row.payment_date)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {row.payment_type === "ONLINE"
                          ? "Online (Instapay)"
                          : "Cash"}
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
