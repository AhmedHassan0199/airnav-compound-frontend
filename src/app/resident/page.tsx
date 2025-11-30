"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { formatDateTime } from "@/lib/dateFormat";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getResidentProfile,
  getResidentInvoices,
  API_BASE,
  submitInstapayPayment,
  getNotificationStatus,
  registerNotificationToken,
} from "@/lib/api";
import { getFirebaseMessaging } from "@/lib/firebase";
import { getToken } from "firebase/messaging";

const INSTAPAY_LINK = process.env.NEXT_PUBLIC_INSTAPAY_LINK;

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
  if (status === "UNPAID") return "غير مسدد";
  if (status === "OVERDUE") return "متأخر";
  if (status === "PENDING") return "غير مسدد";
  if (status === "PENDING_CONFIRMATION") return "في انتظار تأكيد الدفع";
  return status;
}

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

function InvoiceCard({
  invoice,
  onRefresh,
  profile,
}: {
  invoice: Invoice;
  onRefresh?: () => Promise<void> | void;
  profile: Profile | null;
}) {
  const [showInstapayForm, setShowInstapayForm] = useState(false);
  const [instaAmount, setInstaAmount] = useState("");
  const [instaSenderId, setInstaSenderId] = useState("");
  const [instaLoading, setInstaLoading] = useState(false);
  const [instaMessage, setInstaMessage] = useState<string | null>(null);
  const [instaError, setInstaError] = useState<string | null>(null);

  // Hidden transaction ref (not shown to user, but sent to backend)
  const [instaTransactionRef] = useState(() => {
    return `WHATSAPP_${invoice.id}_${Date.now()}`;
  });

  const isPaid = invoice.status === "PAID";
  const isPendingConfirmation = invoice.status === "PENDING_CONFIRMATION";
  const canPayOnline =
    invoice.status === "UNPAID" ||
    invoice.status === "PENDING" ||
    invoice.status === "OVERDUE";

  const statusColor =
    invoice.status === "PAID"
      ? "bg-green-100 text-green-700"
      : invoice.status === "OVERDUE"
      ? "bg-red-100 text-red-700"
      : invoice.status === "PENDING_CONFIRMATION"
      ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-700";

  const residentName =
    profile?.person.full_name || profile?.user.username || "مقيم";
  const building = profile?.person.building || "-";
  const floor = profile?.person.floor || "-";
  const apartment = profile?.person.apartment || "-";

  function handleOpenInstapay() {
    if (!INSTAPAY_LINK) {
      alert("لم يتم ضبط رابط إنستا باي في إعدادات النظام.");
      return;
    }
    window.open(INSTAPAY_LINK, "_blank");

    if (!instaAmount) {
      setInstaAmount(invoice.amount.toFixed(2));
    }
    setShowInstapayForm(true);
    setInstaMessage(null);
    setInstaError(null);
  }

  function openWhatsappChat() {
    const base = "https://wa.me/201090707277";

    const text =
      `السلام عليكم,\n` +
      `أنا: ${residentName}\n` +
      `الوحدة: مبنى ${building} – دور ${floor} – شقة ${apartment}\n\n` +
      `قمت بتحويل مبلغ صيانة عن طريق إنستا باي.\n` +
      `تفاصيل الفاتورة:\n` +
      `- الشهر: ${invoice.month}/${invoice.year}\n` +
      `- المبلغ: ${invoice.amount.toFixed(2)} جنيه\n\n` +
      `سأرسل الآن صورة من التحويل هنا على الواتساب.\n` +
      `شكراً لكم.`;

    const url = `${base}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  async function handleSubmitInstapay() {
    try {
      if (!instaAmount || !instaSenderId) {
        setInstaError("برجاء إدخال المبلغ ورقم الموبايل / حساب إنستا باي.");
        return;
      }

      const amountNum = parseFloat(instaAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setInstaError("المبلغ غير صالح.");
        return;
      }

      setInstaLoading(true);
      setInstaError(null);
      setInstaMessage(null);

      await submitInstapayPayment(invoice.id, {
        amount: amountNum,
        instapay_sender_id: instaSenderId,
        transaction_ref: instaTransactionRef, // hidden, auto-generated
      });

      setInstaMessage(
        "تم تسجيل طلب الدفع الإلكتروني، برجاء التأكد من إرسال صورة التحويل على الواتساب. جاري مراجعة الطلب من قِبل الإدارة."
      );
      setShowInstapayForm(false);
      setInstaSenderId("");
      setInstaAmount("");

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      setInstaError(
        err?.message || "تعذر تسجيل عملية إنستا باي، برجاء المحاولة مرة أخرى."
      );
    } finally {
      setInstaLoading(false);
    }
  }

  function resetInstapayForm() {
    setShowInstapayForm(false);
    setInstaSenderId("");
    setInstaAmount("");
    setInstaMessage(null);
    setInstaError(null);
  }

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
        <span>{invoice.due_date ? formatDateTime(invoice.due_date) : "-"}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>تاريخ السداد:</span>
        <span>{invoice.paid_date ? formatDateTime(invoice.paid_date) : "-"}</span>
      </div>

      {isPaid ? (
        <button
          onClick={() =>
            downloadInvoicePdf(invoice.id, invoice.year, invoice.month)
          }
          className="mt-1 self-start text-xs px-3 py-1.5 rounded-lg bg-brand-cyan text-white hover:opacity-90"
        >
          تحميل الايصال PDF
        </button>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-slate-500">
            بعد التحويل عن طريق إنستا باي، لو سمحت ابعت صورة من عملية التحويل على
            الواتساب لتأكيد الدفع، ثم اضغط على زر تسجيل العملية هنا.
          </p>

          {isPendingConfirmation ? (
            <p className="text-[11px] text-slate-600">
              تم تسجيل طلب دفع إلكتروني لهذه الفاتورة، وجاري مراجعته من قِبل الإدارة.
            </p>
          ) : (
            canPayOnline && (
              <div className="mt-2 space-y-2">
                {/* Instapay button with small "logo" */}
                <button
                  type="button"
                  onClick={handleOpenInstapay}
                  className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:opacity-90 inline-flex items-center justify-center gap-2"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/15 border border-white/40 text-[11px] font-bold">
                    i
                  </span>
                  <span>الدفع عن طريق إنستا باي</span>
                </button>

                {/* Instapay details form */}
                {showInstapayForm && (
                  <div className="mt-2 border-t pt-2 space-y-2 text-right">
                    <p className="text-[11px] text-slate-600">
                      بعد إتمام التحويل من خلال تطبيق إنستا باي إلى حساب الاتحاد،
                      برجاء إدخال البيانات التالية، ثم إرسال صورة من التحويل على
                      الواتساب.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-700 mb-1">
                          المبلغ المحوَّل (جنيه)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border rounded-lg px-2 py-1 text-right text-[11px]"
                          value={instaAmount}
                          onChange={(e) => setInstaAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-700 mb-1">
                          رقم الموبايل / حساب إنستا باي المرسِل
                        </label>
                        <input
                          type="text"
                          className="w-full border rounded-lg px-2 py-1 text-right text-[11px]"
                          value={instaSenderId}
                          onChange={(e) => setInstaSenderId(e.target.value)}
                          placeholder="مثال: 0100XXXXXXX أو user@instapay"
                        />
                      </div>
                    </div>

                    {/* WhatsApp button */}
                    <button
                      type="button"
                      onClick={openWhatsappChat}
                      className="w-full px-3 py-2 rounded-lg bg-[#25D366] text-white text-xs sm:text-sm font-semibold hover:opacity-90 inline-flex items-center justify-center gap-2"
                    >
                      <span className="text-lg leading-none">🟢</span>
                      <span>إرسال صورة التحويل على واتساب</span>
                    </button>

                    <div className="flex items-center justify-end gap-2 mt-1">
                      <button
                        type="button"
                        onClick={resetInstapayForm}
                        className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px]"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        disabled={instaLoading}
                        onClick={handleSubmitInstapay}
                        className="px-3 py-1.5 rounded-lg bg-brand-cyan text-white text-[11px] sm:text-xs font-semibold disabled:opacity-60"
                      >
                        {instaLoading
                          ? "جارٍ التسجيل..."
                          : "تسجيل عملية إنستا باي"}
                      </button>
                    </div>

                    {instaMessage && (
                      <p className="text-[11px] text-green-700 mt-1">
                        {instaMessage}
                      </p>
                    )}
                    {instaError && (
                      <p className="text-[11px] text-red-700 mt-1">
                        {instaError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}


export default function ResidentPage() {
  const router = useRouter();

  const { user, loading: authLoading } = useRequireAuth(["RESIDENT"]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);

      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("لم يتم العثور على جلسة تسجيل الدخول");
        setLoading(false);
        return;
      }

      const [p, inv] = await Promise.all([
        getResidentProfile(token),
        getResidentInvoices(token),
      ]);

      setProfile(p);
      setInvoices(sortInvoicesForDisplay(inv));
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  // 🔔 Auto-enable notifications if not already enabled
  useEffect(() => {
    if (authLoading) return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function autoEnableNotifications() {
      try {
        const status = await getNotificationStatus();
        if (cancelled) return;

        if (status?.has_subscription) {
          return;
        }

        if (!("Notification" in window)) {
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          return;
        }

        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );

        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          return;
        }

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          return;
        }

        const fcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (!fcmToken) {
          return;
        }

        await registerNotificationToken(fcmToken);
      } catch (err) {
        console.error("Auto-enable notifications error:", err);
      }
    }

    autoEnableNotifications();

    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (typeof window === "undefined") return;
    loadData();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-brand-beige"
        dir="rtl"
      >
        <p className="text-sm text-slate-600">جارٍ تحميل بيانات المقيم...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-brand-beige"
        dir="rtl"
      >
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
      {/* New edit button */}
      <div className="max-w-4xl mx-auto flex justify-end mb-4">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/resident/profile";
            }
          }}
          className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold hover:bg-brand-cyan/90 transition"
        >
          تعديل بياناتي
        </button>
      </div>


      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header / Profile card */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">صفحة المقيم</h1>
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
              لا توجد ايصالات مسجلة حتى الآن.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {invoices.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  onRefresh={loadData}
                  profile={profile}
                />
              ))}
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-1">
            يمكنك تحميل ملف PDF لكل ايصال بعد السداد لاستخدامه في الأرشفة أو الطباعة.
          </p>
        </div>
      </div>
    </main>
  );
}
