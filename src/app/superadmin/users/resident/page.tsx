"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import { superadminCreateUser } from "@/lib/api";

const COUNTRY_CODES = [
  { value: "+20", label: "🇪🇬 مصر (+20)" },
  { value: "+971", label: "🇦🇪 الإمارات (+971)" },
  { value: "+966", label: "🇸🇦 السعودية (+966)" },
  { value: "+974", label: "🇶🇦 قطر (+974)" },
  { value: "+965", label: "🇰🇼 الكويت (+965)" },
];

export default function SuperadminResidentUsersPage() {
  const { user, loading: authLoading } = useRequireAuth(["SUPERADMIN"]);

  const [fullName, setFullName] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [password, setPassword] = useState("");

  // phone split: country code + local number
  const [countryCode, setCountryCode] = useState("+20"); // default Egypt
  const [phoneLocal, setPhoneLocal] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!building || !floor || !apartment || !password) {
      setError("برجاء إدخال المبنى والدور والشقة وكلمة المرور.");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("لم يتم العثور على جلسة دخول صالحة.");
        return;
      }

      // build full phone: +20 + 1001234567
      let fullPhone: string | undefined = undefined;
      if (phoneLocal.trim()) {
        const localClean = phoneLocal.trim().replace(/^0+/, ""); // remove leading zeros
        fullPhone = `${countryCode}${localClean}`;
      }

      // Auto-generate a username for DB purposes, residents won't use it for login
      const generatedUsername = `unit-${building.trim()}-${floor.trim()}-${apartment.trim()}`;

      await superadminCreateUser(token, {
        username: generatedUsername,
        password,
        role: "RESIDENT",
        full_name: fullName || undefined,
        building: building.trim(),
        floor: floor.trim(),
        apartment: apartment.trim(),
        phone: fullPhone,
      });

      setSuccess("تم إنشاء مستخدم الساكن بنجاح.");
      setFullName("");
      setBuilding("");
      setFloor("");
      setApartment("");
      setPassword("");
      setCountryCode("+20");
      setPhoneLocal("");
    } catch (err: any) {
      setError(
        err.message ||
          "تعذر إنشاء مستخدم الساكن. تأكد من عدم وجود ساكن آخر لنفس الوحدة."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="إدارة المستخدمين - إنشاء ساكن" />
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h1 className="text-lg font-bold text-slate-800 mb-2">
            إنشاء مستخدم ساكن جديد
          </h1>
          <p className="text-sm text-slate-600">
            سيتمكن الساكن من الدخول باستخدام بيانات (المبنى - الدور - الشقة) مع كلمة المرور فقط.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <div>
              <label className="block mb-1 text-slate-700">
                الاسم الكامل (اختياري لكن مُفضّل)
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-right"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: أحمد حسن عز الدين"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1 text-slate-700">المبنى</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-right"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="مثال: ١٣"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-700">الدور</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-right"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="مثال: ٤"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-700">الشقة</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-right"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  placeholder="مثال: ١٢"
                  required
                />
              </div>
            </div>

            {/* Phone with country code + local number */}
            <div>
              <label className="block mb-1 text-slate-700">
                رقم الموبايل
              </label>
              <div className="flex gap-2">
                <select
                  className="border rounded-lg px-3 py-2 text-right bg-white min-w-[130px]"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  className="flex-1 border rounded-lg px-3 py-2 text-right"
                  value={phoneLocal}
                  onChange={(e) => setPhoneLocal(e.target.value)}
                  placeholder="مثال: 01234567890"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                سيتم حفظ رقم الموبايل بصيغة دولية، مثل: +201234567890
              </p>
            </div>

            <div>
              <label className="block mb-1 text-slate-700">كلمة المرور</label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="اختر كلمة مرور للساكن"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-3 px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "جارٍ الإنشاء..." : "إنشاء مستخدم الساكن"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
