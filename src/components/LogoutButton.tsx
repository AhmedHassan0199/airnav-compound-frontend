"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    router.push("/");
  }

  return (
    <button
      onClick={logout}
      className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
    >
      تسجيل الخروج
    </button>
  );
}
