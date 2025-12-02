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

  // Function to detect Arabic numerals
  function containsArabicNumbers(str: string) {
    return /[\u0660-\u0669\u06F0-\u06F9]/.test(str);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate Arabic digits BEFORE submitting
    if (
      containsArabicNumbers(building) ||
      containsArabicNumbers(floor) ||
      containsArabicNumbers(apartment)
    ) {
      setError("من فضلك أكتب الأرقام باللغة الإنجليزية");
      return;
    }

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
        <h1 className="text-3xl font-bold text-center text-[#008B9A] mb-2">
          دخول الساكن
        </h1>
        <p className="text-center text-gray-600 mb-6">
          من فضلك أدخل بيانات الوحدة السكنية وكلمة المرور
        </p>

        {error && (
          <div className="text-red-600 text-sm text-center mb-3">{error}</div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
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
            autoComplete="current-password"
            className="hidden"
          />

          {/* NUMERIC STYLE FIX */}
          <style>{`
            input::-webkit-outer-spin-button,
            input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            input[type=number] {
              -moz-appearance: textfield;
            }
          `}</style>

          {/* BUILDING */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              المبنى
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="building"
              autoComplete="off"
              className="w-full px-4 py-3 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={building}
              onChange={(e) => {
                const v = e.target.value;

                if (containsArabicNumbers(v)) {
                  setError("من فضلك أكتب الأرقام باللغة الإنجليزية");
                  return;
                }

                if (/^\d*$/.test(v)) {
                  setError("");
                  setBuilding(v);
                }
              }}
              placeholder="رقم المبنى"
              required
            />
          </div>

          {/* FLOOR */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              الدور
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="floor"
              autoComplete="off"
              className="w-full px-4 py-3 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={floor}
              onChange={(e) => {
                const v = e.target.value;

                if (containsArabicNumbers(v)) {
                  setError("من فضلك أكتب الأرقام باللغة الإنجليزية");
                  return;
                }

                if (/^\d*$/.test(v)) {
                  setError("");
                  setFloor(v);
                }
              }}
              placeholder="رقم الدور"
              required
            />
          </div>

          {/* APARTMENT */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              الشقة
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="apartment"
              autoComplete="off"
              className="w-full px-4 py-3 border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={apartment}
              onChange={(e) => {
                const v = e.target.value;

                if (containsArabicNumbers(v)) {
                  setError("من فضلك أكتب الأرقام باللغة الإنجليزية");
                  return;
                }

                if (/^\d*$/.test(v)) {
                  setError("");
                  setApartment(v);
                }
              }}
              placeholder="رقم الشقة"
              required
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              كلمة المرور
            </label>
            <input
              type="password"
              name="resident-password"
              autoComplete="new-password"
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
