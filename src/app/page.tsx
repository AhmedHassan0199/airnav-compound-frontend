"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  // Resident login fields
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");

  // Staff login fields
  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      let payload: any = { password };

      // Staff login (ADMIN / SUPERADMIN / TREASURER / ONLINE_ADMIN)
      if (username.trim() !== "") {
        payload.username = username.trim();
      }
      // Resident login (building + floor + apartment + password)
      else {
        payload.building = building.trim();
        payload.floor = floor.trim();
        payload.apartment = apartment.trim();
      }

      const data = await login(payload); // login() must now accept an object, not (username, password)

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("role", data.user.role);

      if (
        data.user.role === "SUPERADMIN" ||
        data.user.role === "ADMIN" ||
        data.user.role === "ONLINE_ADMIN"
      ) {
        router.push("/dashboard");
      } else if (data.user.role === "TREASURER") {
        router.push("/treasurer");
      } else {
        router.push("/resident");
      }
    } catch (err: any) {
      setError("بيانات الدخول غير صحيحة. تأكد من صحة البيانات.");
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EDE7DB] to-[#CFEDEF] px-4"
    >
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md animate-fadeIn">
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-[#008B9A] mb-2">
          بوابة اتحاد الشاغلين
        </h1>
        <p className="text-center text-gray-600 mb-8">
          مدينة الملاحة الجوية – حدائق النزهة
        </p>

        {/* Error */}
        {error && (
          <div className="text-red-600 text-sm text-center mb-3">{error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Staff login (username) */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              اسم المستخدم (للموظفين فقط)
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اكتب اسم مستخدم الموظف (اختياري)"
            />
          </div>

          {/* Divider text */}
          <p className="text-center text-gray-500 text-sm">أو استخدم بيانات السكن</p>

          {/* Building */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              المبنى
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="المبنى (مثال: A1)"
              disabled={username.trim() !== ""}
            />
          </div>

          {/* Floor */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              الدور
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="الدور"
              disabled={username.trim() !== ""}
            />
          </div>

          {/* Apartment */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              الشقة
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
              placeholder="رقم الشقة"
              disabled={username.trim() !== ""}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              كلمة المرور
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#00A9B7] hover:bg-[#008B9A] text-white py-3 rounded-lg text-lg font-semibold transition-all duration-200"
          >
            دخول
          </button>
        </form>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s ease-out;
        }
      `}</style>
    </div>
  );
}
