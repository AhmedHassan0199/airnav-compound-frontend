"use client";

import { useEffect, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { useRequireAuth } from "@/lib/auth";
import {
  adminSearchResidents,
  superadminGetResidentProfile,
  superadminUpdateResidentProfile,
} from "@/lib/api";

type ResidentSearchItem = {
  id: number;
  username: string;
  role: string;
  person: {
    full_name: string;
    building: string;
    floor: string;
    apartment: string;
  };
  unpaid_invoices_count: number;
};

type ResidentProfile = {
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

export default function SuperadminResidentProfilePage() {
  const { user, loading: authLoading } = useRequireAuth(["SUPERADMIN"]);

  const [buildingFilter, setBuildingFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [apartmentFilter, setApartmentFilter] = useState("");

  const [residents, setResidents] = useState<ResidentSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedResident, setSelectedResident] =
    useState<ResidentSearchItem | null>(null);

  const [residentProfile, setResidentProfile] =
    useState<ResidentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [canEditProfileFlag, setCanEditProfileFlag] = useState<boolean | null>(
    null
  );
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    // ممكن تسيبها فاضية أو تعمل أول load بدون فلاتر
    // handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();

    try {
      setSearchError(null);
      setSearchLoading(true);

      const token = localStorage.getItem("access_token");
      if (!token) {
        setSearchError("لم يتم العثور على جلسة تسجيل الدخول");
        setSearchLoading(false);
        return;
      }

      const filters: any = {};
      if (buildingFilter.trim()) filters.building = buildingFilter.trim();
      if (floorFilter.trim()) filters.floor = floorFilter.trim();
      if (apartmentFilter.trim()) filters.apartment = apartmentFilter.trim();

      const data = await adminSearchResidents(token, filters);
      setResidents(data);
    } catch (err: any) {
      setSearchError(err.message || "حدث خطأ أثناء تحميل قائمة السكان");
    } finally {
      setSearchLoading(false);
    }
  }

  async function loadResidentProfile(res: ResidentSearchItem) {
    setSelectedResident(res);
    setResidentProfile(null);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      setProfileLoading(true);
      const token = localStorage.getItem("access_token");
      if (!token) {
        setProfileError("لم يتم العثور على جلسة تسجيل الدخول");
        setProfileLoading(false);
        return;
      }

      const profileData: ResidentProfile = await superadminGetResidentProfile(
        token,
        res.id
      );
      setResidentProfile(profileData);

      const p = profileData.person;
      setFullName(p.full_name || "");
      setBuilding(p.building || "");
      setFloor(p.floor || "");
      setApartment(p.apartment || "");
      setPhone(p.phone || "");
      setPassword("");

      const canEdit =
        typeof profileData.user.can_edit_profile === "boolean"
          ? profileData.user.can_edit_profile
          : true;
      setCanEditProfileFlag(canEdit);

      setProfileLoading(false);
    } catch (err: any) {
      setProfileError(err.message || "تعذر تحميل بيانات المقيم");
      setProfileLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!selectedResident) return;

    if (
      !fullName.trim() ||
      !building.trim() ||
      !floor.trim() ||
      !apartment.trim() ||
      !phone.trim()
    ) {
      setProfileError(
        "برجاء إدخال الاسم الكامل، المبنى، الدور، الشقة، ورقم الموبايل."
      );
      return;
    }

    try {
      setSavingProfile(true);
      const token = localStorage.getItem("access_token");
      if (!token) {
        setProfileError("لم يتم العثور على جلسة تسجيل الدخول");
        setSavingProfile(false);
        return;
      }

      await superadminUpdateResidentProfile(token, selectedResident.id, {
        full_name: fullName.trim(),
        building: building.trim(),
        floor: floor.trim(),
        apartment: apartment.trim(),
        phone: phone.trim(),
        password: password || undefined,
        can_edit_profile: canEditProfileFlag ?? undefined,
      });

      setProfileSuccess("تم حفظ بيانات المقيم بنجاح.");
      setPassword("");
    } catch (err: any) {
      setProfileError(err.message || "تعذر حفظ بيانات المقيم");
    } finally {
      setSavingProfile(false);
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

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="تعديل بيانات ساكن (المشرف العام)" />
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              المبنى
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              placeholder="مثال: 10"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              الدور
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              placeholder="مثال: 4"
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">
              الشقة
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              placeholder="مثال: 12"
              value={apartmentFilter}
              onChange={(e) => setApartmentFilter(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold hover:bg-brand-cyan/90 disabled:opacity-60"
            disabled={searchLoading}
          >
            {searchLoading ? "جارٍ البحث..." : "بحث"}
          </button>
        </form>

        {searchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {searchError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Residents list */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-3 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">
              قائمة السكان
            </h2>
            {searchLoading && residents.length === 0 ? (
              <p className="text-sm text-slate-600">جارٍ تحميل السكان...</p>
            ) : residents.length === 0 ? (
              <p className="text-sm text-slate-600">
                لا توجد نتائج. جرّب تعديل بيانات البحث.
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {residents.map((res) => (
                  <button
                    key={res.id}
                    className={`w-full text-right border rounded-lg p-3 text-sm hover:bg-slate-50 transition ${
                      selectedResident?.id === res.id
                        ? "border-brand-cyan bg-slate-50"
                        : "border-slate-200"
                    }`}
                    onClick={() => loadResidentProfile(res)}
                  >
                    <div className="font-semibold text-slate-800">
                      {res.person.full_name}
                    </div>
                    <div className="text-xs text-slate-600">
                      مبنى {res.person.building} – دور {res.person.floor} – شقة{" "}
                      {res.person.apartment}
                    </div>
                    <div className="text-xs mt-1 text-slate-600">
                      اسم المستخدم: {res.username}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile editor */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              تعديل بيانات المقيم
            </h2>

            {!selectedResident ? (
              <p className="text-sm text-slate-600">
                اختر ساكناً من القائمة على اليسار لعرض وتعديل بياناته.
              </p>
            ) : profileLoading && !residentProfile ? (
              <p className="text-sm text-slate-600">جارٍ تحميل البيانات...</p>
            ) : (
              <>
                {profileError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 mb-2">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg p-2 mb-2">
                    {profileSuccess}
                  </div>
                )}

                <form
                  onSubmit={handleSaveProfile}
                  className="space-y-3 text-sm max-w-xl"
                >
                  <div>
                    <label className="block mb-1 text-slate-700">
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 text-right"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block mb-1 text-slate-700">
                        المبنى
                      </label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 text-right"
                        value={building}
                        onChange={(e) => setBuilding(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-700">
                        الدور
                      </label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 text-right"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-700">
                        الشقة
                      </label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 text-right"
                        value={apartment}
                        onChange={(e) => setApartment(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-700">
                      رقم الموبايل
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 text-right"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="مثال: +201234567890"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-700">
                      كلمة المرور الجديدة (اختياري – لإعادة التعيين)
                    </label>
                    <input
                      type="password"
                      className="w-full border rounded-lg px-3 py-2 text-right"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="اتركه فارغاً إذا لا تريد تغييره"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="can-edit-profile-flag"
                      type="checkbox"
                      className="w-4 h-4"
                      checked={!!canEditProfileFlag}
                      onChange={(e) =>
                        setCanEditProfileFlag(e.target.checked)
                      }
                    />
                    <label
                      htmlFor="can-edit-profile-flag"
                      className="text-xs text-slate-700"
                    >
                      السماح للمقيم بتعديل بياناته مرة أخرى
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                  >
                    {savingProfile ? "جارٍ الحفظ..." : "حفظ بيانات المقيم"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
