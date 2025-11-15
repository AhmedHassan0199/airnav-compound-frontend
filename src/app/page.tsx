import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE}/auth/login`,
        { username, password }
      );

      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("role", res.data.role);

      if (res.data.role === "RESIDENT") router.push("/resident");
      else if (res.data.role === "ADMIN") router.push("/admin");
      else if (res.data.role === "TREASURER") router.push("/treasurer");
      else if (res.data.role === "SUPERADMIN") router.push("/superadmin");
    } catch (err: any) {
      setError("بيانات الدخول غير صحيحة. تأكد من اسم المستخدم وكلمة السر.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EDE7DB] to-[#CFEDEF] px-4" dir="rtl">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md animate-fadeIn">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2 text-[#008B9A]">
          بوابة اتحاد شاغلين
        </h1>
        <h2 className="text-lg text-center text-gray-600 mb-8">
          مدينة الملاحة الجوية – حدائق النزهة
        </h2>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block mb-1 font-semibold text-gray-700">اسم المستخدم</label>
            <input
              type="text"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اكتب اسم المستخدم"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-700">كلمة المرور</label>
            <input
              type="password"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#00A9B7] hover:bg-[#008B9A] text-white py-3 rounded-lg text-lg font-semibold transition-all duration-200"
          >
            تسجيل الدخول
          </button>
        </form>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s ease-out;
        }
      `}</style>
    </div>
  );
}
