"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import { getResidentProfile, residentUpdateProfile } from "@/lib/api";
import DashboardHeader from "@/components/DashboardHeader";

type ProfileResponse = {
  user: {
    id: number;
    username: string | null;
    role: string;
    can_edit_profile: boolean;
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
  const { user, loading: authLoading } = useRequireAuth(["RESIDENT"]);

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (typeof window === "undefined") return;

    async function load() {
      try {
        setError(null);
        setLoading(true);
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("لم يتم العثور على جلسة تسجيل الدخول.");
          setLoading(false);
          return;
        }
        const data = await getResidentProfile(token);
        setProfile(data);
        setFullName(data.person.full_name || "");
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء تحميل البيانات.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading]);

  const canEdit = profile?.user.can_edit_profile ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setError(null);
    setSuccess(null);

    if (!fullName && !password) {
      setError("برجاء إدخال اسم جديد و/أو كلمة مرور جديدة.");
      return;
    }

    if (password && password !== password2) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    try {
      setSaving(true);
      const payload: { full_name?: string; password?: string } = {};
      if (fullName) payload.full_name = fullName;
      if (password) payload.password = password;

      const result = await residentUpdateProfile(payload);

      setProfile({
        user: result.user,
        person: result.person,
      });
      setSuccess("تم تحديث البيانات بنجاح، ولن يمكنك التعديل مرة أخرى.");
      setPassword("");
      setPassword2("");
    } catch (err: any) {
      setError(err.message || "تعذر تحديث البيانات.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-beige flex items-center justify-center" dir="rtl">
        <p className="text-sm text-slate-600">جارٍ تحميل صفحة تعديل البيانات...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-brand-beige flex items-center justify-center" dir="rtl">
        <p className="text-sm text-red-600">
          تعذر تحميل بيانات الحساب. حاول تسجيل الدخول مرة أخرى.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="تعديل بياناتي" />
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800 mb-1">
            تعديل بيانات المقيم
          </h1>
          <p className="text-xs text-slate-600">
            يمكنك تعديل الاسم وكلمة المرور مرة واحدة فقط. بعد الحفظ لن يمكنك التعديل مرة أخرى
            إلا من خلال المشرف العام.
          </p>
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
            {success}
          </div>
        )}

        <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
          <div>
            الوحدة: عمارة {profile.person.building ?? "-"} – دور{" "}
            {profile.person.floor ?? "-"} – شقة {profile.person.apartment ?? "-"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block mb-1 text-slate-700">الاسم الكامل</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-right"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!canEdit}
              placeholder="مثال: أحمد حسن عز الدين"
            />
          </div>

          <div>
            <label className="block mb-1 text-slate-700">
              كلمة المرور الجديدة (اختياري)
            </label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-right"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!canEdit}
              placeholder="اتركها فارغة إذا كنت لا تريد تغييرها"
            />
          </div>

          <div>
            <label className="block mb-1 text-slate-700">
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-right"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          {canEdit ? (
            <button
              type="submit"
              disabled={saving}
              className="mt-2 px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </button>
          ) : (
            <p className="text-xs text-slate-500 mt-2">
              لقد قمت بتعديل بياناتك من قبل، ولا يمكنك التعديل مرة أخرى. إذا كانت هناك مشكلة،
              برجاء التواصل مع المشرف العام.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
