"use client";

import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import {
  publicCreateElectionTransportBooking,
  type ElectionTransportBookingPayload,
} from "@/lib/api";

const STATIONS: ElectionTransportBookingPayload["station"][] = [
  "مدينة الملاحة الجوية",
  "شيراتون",
  "مدينة نصر",
];

export default function ElectionTransportBookingPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState("1");
  const [station, setStation] =
    useState<ElectionTransportBookingPayload["station"]>("مدينة الملاحة الجوية");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function normalizePhone(p: string) {
    // بس تنظيف بسيط (اختياري) — خليه زي ما تحب
    return p.replace(/\s+/g, "").trim();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccessMsg(null);

    const cleanPhone = normalizePhone(phone);

    if (!name.trim() || !cleanPhone || !seats || !station) {
      setErr("من فضلك املأ كل الحقول.");
      return;
    }

    const seatsNum = parseInt(seats, 10);
    if (Number.isNaN(seatsNum) || seatsNum < 1 || seatsNum > 5) {
      setErr("عدد الكراسي لازم يكون من 1 إلى 5.");
      return;
    }

    try {
      setLoading(true);

      await publicCreateElectionTransportBooking({
        name: name.trim(),
        phone: cleanPhone,
        seats: seatsNum,
        station,
      });

      setSuccessMsg("تم تسجيل الحجز بنجاح ✅ هنكلمك لتأكيد التفاصيل.");
      setName("");
      setPhone("");
      setSeats("1");
      setStation("مدينة الملاحة الجوية");
    } catch (e: any) {
      setErr(e.message || "تعذر تسجيل الحجز.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="حجز انتقالات الانتخابات" />

      <div className="max-w-3xl mx-auto space-y-4">
        {/* Intro + Bus placeholder */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              حجز انتقالات لانتخابات جمعية إسكان الملاحة الجوية
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              من فضلك سجّل بياناتك لحجز مكان في الأتوبيس.{" "}
              <span className="font-semibold text-slate-700">
                كل الحقول إلزامية
              </span>
              .
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ملاحظة: كل رقم موبايل يقدر يحجز مرة واحدة فقط.
            </p>
          </div>

          {/* Bus image / svg placeholder */}
          <div className="w-full md:w-64 h-32 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
            مكان صورة/أيقونة الأتوبيس
          </div>
        </div>

        {/* Alerts */}
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {err}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <form onSubmit={submit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-700">
                الاسم
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-right"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اكتب الاسم بالكامل"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-700">
                رقم الموبايل
              </label>
              <input
                type="tel"
                className="w-full border rounded-lg px-3 py-2 text-right"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 01XXXXXXXXX"
                required
              />
            </div>

            {/* Seats + Station */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  عدد الكراسي
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-right"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  required
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  المحطة
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-right"
                  value={station}
                  onChange={(e) =>
                    setStation(e.target.value as ElectionTransportBookingPayload["station"])
                  }
                  required
                >
                  {STATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-brand-cyan text-white font-semibold disabled:opacity-60 hover:bg-[#008B9A] transition-colors"
            >
              {loading ? "جارٍ تسجيل الحجز..." : "تأكيد الحجز"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
