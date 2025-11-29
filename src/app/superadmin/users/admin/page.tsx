"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import {
  superadminCreateUser,
  superadminGetAdminsWithBuildings,
  superadminAssignBuildingToAdmin,
} from "@/lib/api";

const ADMIN_ROLES = [
  { value: "ADMIN", label: "مسؤول تحصيل" },
  { value: "TREASURER", label: "أمين صندوق" },
  { value: "SUPERADMIN", label: "مشرف عام" },
  { value: "ONLINE_ADMIN", label: "مسؤول تحصيل اونلاين" },
];

const COUNTRY_CODES = [
  { value: "+20", label: "🇪🇬 مصر (+20)" },
  { value: "+971", label: "🇦🇪 الإمارات (+971)" },
  { value: "+966", label: "🇸🇦 السعودية (+966)" },
  { value: "+974", label: "🇶🇦 قطر (+974)" },
  { value: "+965", label: "🇰🇼 الكويت (+965)" },
];

// Generate building numbers from 1 to 116 as strings
const BUILDINGS = Array.from({ length: 116 }, (_, i) => (i + 1).toString());

export default function SuperadminAdminUsersPage() {
  const { user, loading: authLoading } = useRequireAuth(["SUPERADMIN"]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ADMIN");

  const [fullName, setFullName] = useState("");

  // phone split: country code + local number
  const [countryCode, setCountryCode] = useState("+20"); // default Egypt
  const [phoneLocal, setPhoneLocal] = useState("");

  // For ADMIN role: initial building assignments
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);

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

  function handleBuildingsChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setSelectedBuildings(values);
  }

  function handleSelectAllBuildings() {
    setSelectedBuildings(BUILDINGS);
  }

  function handleClearBuildings() {
    setSelectedBuildings([]);
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

      // 1) Create the user (ADMIN / TREASURER / SUPERADMIN / ONLINE_ADMIN)
      await superadminCreateUser(token, {
        username,
        password,
        role: role as any,
        full_name: fullName || undefined,
        // building/floor/apartment are not needed for staff accounts
        building: undefined,
        floor: undefined,
        apartment: undefined,
        phone: fullPhone,
      });

      // 2) If role is ADMIN, assign initial buildings
      if (role === "ADMIN" && selectedBuildings.length > 0) {
        // Reload list of admins to find the new one by username
        const admins = await superadminGetAdminsWithBuildings(token);
        const createdAdmin = admins.find(
          (a: any) => a.username === username && a.role === "ADMIN"
        );

        if (createdAdmin) {
          for (const b of selectedBuildings) {
            await superadminAssignBuildingToAdmin(token, createdAdmin.id, b);
          }
        }
      }

      setSuccess("تم إنشاء المستخدم بنجاح.");
      setUsername("");
      setPassword("");
      setFullName("");
      setCountryCode("+20");
      setPhoneLocal("");
      setSelectedBuildings([]);
    } catch (err: any) {
      setError(err.message || "تعذر إنشاء المستخدم.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="إدارة المستخدمين - إنشاء موظف" />
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h1 className="text-lg font-bold text-slate-800 mb-2">
            إنشاء مستخدم موظف جديد
          </h1>
          <p className="text-sm text-slate-600">
            يمكن إنشاء مستخدمين من الأنواع: مسؤول تحصيل، أمين صندوق، مشرف عام،
            أو مسؤول تحصيل أونلاين. في حالة مسؤول التحصيل يمكن تعيين مباني
            مسؤول عنها من هنا كتهيئة أولية.
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
                {ADMIN_ROLES.map((r) => (
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
                placeholder="مثال: admin_ahmed أو treasurer1"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-slate-700">كلمة المرور</label>
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

            {/* Initial buildings for ADMIN only */}
            {role === "ADMIN" && (
              <div>
                <label className="block mb-1 text-slate-700">
                  المباني المسؤول عنها (اختياري كتهيئة أولية)
                </label>
                <p className="text-[11px] text-slate-500 mb-1">
                  يمكنك تعديل هذه المباني لاحقاً من صفحة &quot;توزيع المباني على
                  المسؤولين&quot;.
                </p>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleSelectAllBuildings}
                    className="px-2 py-1 text-xs bg-brand-cyan text-white rounded-md"
                  >
                    اختيار كل المباني ١ إلى ١١٦
                  </button>
                  <button
                    type="button"
                    onClick={handleClearBuildings}
                    className="px-2 py-1 text-xs border rounded-md text-slate-700 bg-white"
                  >
                    مسح الاختيار
                  </button>
                </div>
                <select
                  multiple
                  className="w-full border rounded-lg px-3 py-2 text-right h-40"
                  value={selectedBuildings}
                  onChange={handleBuildingsChange}
                >
                  {BUILDINGS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  اضغط مع الاستمرار على Ctrl (في الكمبيوتر) لاختيار أكثر من مبنى.
                </p>
              </div>
            )}

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
