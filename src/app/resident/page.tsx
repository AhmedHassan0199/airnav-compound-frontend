"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import { getResidentProfile, getResidentInvoices, API_BASE } from "@/lib/api";

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

function formatStatus(status: string) {
  if (status === "PAID") return "مسدد";
  if (status === "PENDING") return "غير مسدد";
  if (status === "OVERDUE") return "متأخرة";
  return status;
}

async function downloadInvoicePdf(invoiceId: number, year: number, month: number) {
  const token = localStorage.getItem("access_token");
  if (!token) {
    alert("برجاء تسجيل الدخول مرة أخرى.");
    return;
  }

  const res = await fetch(`${API_BASE}/resident/invoices/${invoiceId}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.message || "تعذر تحميل ملف الايصال.");
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = ` ايصال-صيانة-${year}-${month}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const statusColor =
    invoice.status === "PAID"
      ? "bg-green-100 text-green-700"
      : invoice.status === "OVERDUE"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="border rounded-xl p-3 flex flex-col gap-2 text-sm bg-slate-50">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-slate-800">
          شهر {invoice.month}/{invoice.year}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor}`}>
          {formatStatus(invoice.status)}
        </span>
      </div>

      <div className="flex items-center justify-between text-slate-700">
        <div>القيمة:</div>
        <div className="font-semibold">{invoice.amount.toFixed(2)} جنيه</div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>تاريخ الاستحقاق:</span>
        <span>{invoice.due_date || "-"}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>تاريخ السداد:</span>
        <span>{invoice.paid_date || "-"}</span>
      </div>

      {invoice.status === "PAID" ? (
        <button
          onClick={() =>
            downloadInvoicePdf(invoice.id, invoice.year, invoice.month)
          }
          className="mt-1 self-start text-xs px-3 py-1.5 rounded-lg bg-brand-cyan text-white hover:opacity-90"
        >
          تحميل الايصال PDF
        </button>
      ) : (
        <p className="mt-1 text-[11px] text-slate-500">
          لا يمكن تحميل الايصال قبل سدادها.
        </p>
      )}
    </div>
  );
}

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
      <DashboardHeader title="حساب الساكن" />
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
      {/* Invoices cards */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">
           ايصالات الصيانة الشهرية
        </h2>

        {invoices.length === 0 ? (
          <p className="text-sm text-slate-600">
            لا توجد  ايصالات مسجلة حتى الآن.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {invoices.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} />
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-500 mt-1">
          يمكنك تحميل ملف PDF لكل ايصال لاستخدامه في الأرشفة أو الطباعة.
        </p>
      </div>
      </div>
    </main>
  );
}
