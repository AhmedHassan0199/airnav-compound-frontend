"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

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

        <p className="text-center text-gray-700 mb-6">
          من فضلك اختر نوع الدخول:
        </p>

        <div className="space-y-4">
          <button
            onClick={() => router.push("/login/resident")}
            className="w-full bg-[#00A9B7] hover:bg-[#008B9A] text-white py-3 rounded-lg text-lg font-semibold transition-all duration-200"
          >
            دخول كساكن
          </button>

          <button
            onClick={() => router.push("/login/admin")}
            className="w-full bg-white border border-[#00A9B7] text-[#00A9B7] hover:bg-[#E0F5F7] py-3 rounded-lg text-lg font-semibold transition-all duration-200"
          >
            دخول كموظف (أدمن / أمين خزينة)
          </button>
        </div>
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
