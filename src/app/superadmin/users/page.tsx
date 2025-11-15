"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import { superadminCreateUser } from "@/lib/api";

const ROLES = [
  { value: "RESIDENT", label: "ساكن" },
  { value: "ADMIN", label: "مسؤول تحصيل" },
  { value: "TREASURER", label: "أمين صندوق" },
  { value: "SUPERADMIN", label: "مشرف عام" },
];

export default function SuperadminUsersPage() {
  const { user, loading: authLoading } = useRequireAuth(["SUPERADMIN"]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TREASURER");

  const [fullName, setFullName] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [phone, setPhone] = useState("");

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || !password) {
      setError("برجاء إدخال اسم المستخدم وكلمة المرور.");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("access_token");

      await superadminCreateUser(token, {
        username,
        password,
        role: role as any,
        full_name: fullName || undefined,
        building: building || undefined,
        floor: floor || undefined,
        apartment: apartment || undefined,
        phone: phone || undefined,
      });

      setSuccess("تم إنشاء المستخدم بنجاح.");
      setUsername("");
      setPassword("");
      setFullName("");
      setBuilding("");
      setFloor("");
      setApartment("");
      setPhone("");
    } catch (err: any) {
      setError(err.message || "تعذر إنشاء المستخدم.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="إدارة المستخدمين" />
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h1 className="text-lg font-bold text-slate-800 mb-2">
            إنشاء مستخدم جديد
          </h1>
          <p className="text-sm text-slate-600">
            يمكن للمشرف العام إنشاء مستخدمين من الأنواع: ساكن، مسؤول تحصيل، أمين
            صندوق، أو مشرف عام.
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
                نوع المستخدم / الصلاحية
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-right"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-slate-700">
                اسم المستخدم (لتسجيل الدخول)
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-right"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: treasurer1 أو admin_ahmed"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-slate-700">
                كلمة المرور
              </label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="اختر كلمة مرور قوية"
                required
              />
            </div>

            <hr className="my-2" />

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

            <div>
              <label className="block mb-1 text-slate-700">
                رقم الموبايل (مع كود الدولة)
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-right"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: +201001234567"
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
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-3 px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "جارٍ الإنشاء..." : "إنشاء المستخدم"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
