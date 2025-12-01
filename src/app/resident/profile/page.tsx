"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";
import { useRequireAuth } from "@/lib/auth";
import { getResidentProfile, residentUpdateProfile } from "@/lib/api";

const COUNTRY_CODES = [
  { value: "+20", label: "🇪🇬 مصر (+20)" },
  { value: "+971", label: "🇦🇪 الإمارات (+971)" },
  { value: "+966", label: "🇸🇦 السعودية (+966)" },
  { value: "+974", label: "🇶🇦 قطر (+974)" },
  { value: "+965", label: "🇰🇼 الكويت (+965)" },
];

type ProfileResponse = {
  user: {
    id: number;
    username: string;
    role: string;
    can_edit_profile?: boolean;
  };
  person: {
    full_name: string | null;
    building: string | null;
    floor: string | null;
    apartment: string | null;
    phone: string | null;
  };
};

export default function ResidentEditProfilePage() {
  useRequireAuth(["RESIDENT"]);
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // form state
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+20");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [canEdit, setCanEdit] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("لم يتم العثور على جلسة تسجيل الدخول.");
          setLoading(false);
          return;
        }

        const data: ProfileResponse = await getResidentProfile(token);
        setProfile(data);

        const p = data.person;
        const user = data.user;

        // الاسم يتملّى من ال profile أو من ال username كـ fallback
        setFullName(p.full_name || user.username || "");

        // تقسيم رقم الموبايل: كود دولة + باقي الرقم
        if (p.phone && p.phone.trim() !== "") {
          const phoneTrimmed = p.phone.trim();

          const found = COUNTRY_CODES.find((c) =>
            phoneTrimmed.startsWith(c.value)
          );

          if (found) {
            setCountryCode(found.value);
            const rest = phoneTrimmed.slice(found.value.length);
            setPhoneLocal(rest);
          } else {
            // لو اتحفظ بدون كود، نحط +20 ونسيب الرقم كله في local
            setCountryCode("+20");
            setPhoneLocal(phoneTrimmed);
          }
        } else {
          setCountryCode("+20");
          setPhoneLocal("");
        }

        // صلاحية التعديل
        setCanEdit(user.can_edit_profile !== false);
      } catch (err: any) {
        setError(err.message || "تعذر تحميل البيانات.");
      } finally {
        setLoading(false);
      }
    }

    if (typeof window !== "undefined") {
      load();
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canEdit) {
      setError("لا يمكنك تعديل بياناتك مرة أخرى.");
      return;
    }

    if (!fullName.trim()) {
      setError("الاسم الكامل مطلوب.");
      return;
    }

    if (!phoneLocal.trim()) {
      setError("رقم الموبايل مطلوب.");
      return;
    }

    // Build full phone: +20 + 1001234567
    const localClean = phoneLocal.trim().replace(/^0+/, "");
    const fullPhone = `${countryCode}${localClean}`;

    try {
      setSaving(true);
      await residentUpdateProfile({
        full_name: fullName.trim(),
        phone: fullPhone,
        password: password || undefined,
      });

      setSuccess(
        "تم حفظ بياناتك بنجاح. لا يمكن تعديل البيانات مرة أخرى بعد هذه العملية."
      );
      setCanEdit(false);
      setPassword("");
    } catch (err: any) {
      setError(err.message || "تعذر حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-brand-beige"
        dir="rtl"
      >
        <p className="text-sm text-slate-600">جارٍ تحميل بيانات الحساب...</p>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-brand-beige"
        dir="rtl"
      >
        <div className="bg-white rounded-xl shadow-sm p-4 max-w-md w-full text-center">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <p className="text-xs text-slate-500">
            حاول الرجوع للصفحة الرئيسية ثم تسجيل الدخول مرة أخرى.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="تعديل بيانات المقيم" />

      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm p-4 space-y-4">
        <p className="text-xs text-slate-600">
          يمكنك تعديل الاسم الكامل ورقم الموبايل، بالإضافة إلى كلمة المرور (اختياري)،
          مرة واحدة فقط. بعد الحفظ لن تتمكن من تعديل هذه البيانات مرة أخرى من حساب
          المقيم.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg p-2">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="space-y-3 text-sm"
        >
          {/* Fake fields to absorb Chrome autofill */}
          <input
            type="text"
            name="fake-username"
            autoComplete="username"
            className="hidden"
          />
          <input
            type="password"
            name="fake-password"
            autoComplete="new-password"
            className="hidden"
          />

          <div>
            <label className="block mb-1 text-slate-700">الاسم الكامل</label>
            <input
              type="text"
              name="resident-full-name"
              autoComplete="off"
              className="w-full border rounded-lg px-3 py-2 text-right"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={!canEdit}
            />
          </div>

          <div>
            <label className="block mb-1 text-slate-700">رقم الموبايل</label>
            <div className="flex gap-2 w-full">
              <select
                className="border rounded-lg px-3 py-2 text-right bg-white w-[130px] shrink-0"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                disabled={!canEdit}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                name="resident-phone"
                autoComplete="off"
                className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-right"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
                placeholder="مثال: 01234567890"
                required
                disabled={!canEdit}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              سيتم حفظ رقم الموبايل بصيغة دولية، مثل: +201234567890
            </p>
          </div>

          <div>
            <label className="block mb-1 text-slate-700">
              كلمة المرور الجديدة (اختياري)
            </label>
            <input
              type="password"
              name="resident-new-password"
              autoComplete="new-password"
              className="w-full border rounded-lg px-3 py-2 text-right"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="اتركه فارغاً إذا لا تريد تغييره"
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/resident";
                }
              }}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs"
            >
              رجوع لصفحة المقيم
            </button>
            <button
              type="submit"
              disabled={saving || !canEdit}
              className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ البيانات"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
