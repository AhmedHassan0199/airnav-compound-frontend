"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function ResidentLoginPage() {
  const router = useRouter();

  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        building: building.trim(),
        floor: floor.trim(),
        apartment: apartment.trim(),
        password,
      };

      const data = await login(payload);

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("role", data.user.role);

      // Residents go to /resident, any non-resident (if used here) follow same logic as before
      if (data.user.role === "SUPERADMIN") {
        router.push("/superadmin");
      } else if (
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
          دخول الساكن
        </h1>
        <p className="text-center text-gray-600 mb-6">
          من فضلك أدخل بيانات الوحدة السكنية وكلمة المرور
        </p>

        {/* Error */}
        {error && (
          <div className="text-red-600 text-sm text-center mb-3">{error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              required
            />
          </div>

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
              required
            />
          </div>

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
              required
            />
          </div>

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
