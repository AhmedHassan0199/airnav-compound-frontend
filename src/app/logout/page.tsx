"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear session
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    // Redirect to login
    router.push("/");
  }, [router]);

  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-brand-beige"
    >
      
      <p className="text-slate-700 text-sm">جاري تسجيل الخروج...</p>
    </main>
  );
}
