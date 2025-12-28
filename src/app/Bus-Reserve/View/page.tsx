"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import {
  publicGetElectionReservations,
  type ElectionReservationRow,
} from "@/lib/api";

const STATIONS: ElectionReservationRow["station"][] = [
  "مدينة الملاحة الجوية",
  "شيراتون",
  "مدينة نصر",
];

function normalizePhone(p: string) {
  return (p || "").replace(/[^\d]/g, "");
}

function StationBlock({
  station,
  rows,
}: {
  station: ElectionReservationRow["station"];
  rows: ElectionReservationRow[];
}) {
  const reservationCount = rows.length;
  const chairsCount = rows.reduce((s, r) => s + (r.chairs || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{station}</h2>
          <p className="text-xs text-slate-600">
            عدد الحجوزات وإجمالي الكراسي لهذه المحطة
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-600">عدد الحجوزات: </span>
            <span className="font-bold text-slate-900">{reservationCount}</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-600">إجمالي الكراسي: </span>
            <span className="font-bold text-emerald-700">{chairsCount}</span>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-slate-600">لا توجد حجوزات لهذه المحطة.</div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b">
                <th className="py-2 px-3">الاسم</th>
                <th className="py-2 px-3">رقم الموبايل</th>
                <th className="py-2 px-3">عدد الكراسي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 px-3">{r.name}</td>
                  <td className="py-2 px-3">{r.phone}</td>
                  <td className="py-2 px-3 font-semibold">{r.chairs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ElectionReservationsPublicPage() {
  const [rows, setRows] = useState<ElectionReservationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const data = await publicGetElectionReservations();

      // احتياطي: لو فيه تكرارات على نفس الموبايل (مش المفروض يحصل)،
      // هنسيب أحدث واحد لكل رقم.
      const map = new Map<string, ElectionReservationRow>();
      for (const r of data) {
        map.set(normalizePhone(r.phone), r);
      }
      setRows(Array.from(map.values()));
    } catch (e: any) {
      setErr(e.message || "تعذر تحميل الحجوزات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const byStation = useMemo(() => {
    const grouped: Record<string, ElectionReservationRow[]> = {
      "مدينة الملاحة الجوية": [],
      "شيراتون": [],
      "مدينة نصر": [],
    };

    for (const r of rows) {
      if (grouped[r.station]) grouped[r.station].push(r);
    }

    // ترتيب اختياري داخل كل محطة: الأكبر كراسي الأول ثم الأقدم (بالـ id)
    for (const k of Object.keys(grouped)) {
      grouped[k] = grouped[k].slice().sort((a, b) => {
        if ((b.chairs || 0) !== (a.chairs || 0)) return (b.chairs || 0) - (a.chairs || 0);
        return (a.id ?? 0) - (b.id ?? 0);
      });
    }

    return grouped as Record<ElectionReservationRow["station"], ElectionReservationRow[]>;
  }, [rows]);

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="عرض حجوزات الانتقالات" />

      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              حجوزات انتقالات انتخابات جمعية إسكان الملاحة الجوية
            </h1>
            <p className="text-sm text-slate-600">
              عرض الحجوزات مُقسمة حسب المحطة + إجمالي الحجوزات والكراسي لكل محطة.
            </p>
          </div>

          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm"
            disabled={loading}
          >
            {loading ? "جارٍ التحديث..." : "تحديث"}
          </button>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {err}
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-slate-600">
            جارٍ التحميل...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {STATIONS.map((st) => (
              <StationBlock key={st} station={st} rows={byStation[st] || []} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}