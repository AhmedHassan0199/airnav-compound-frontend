"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      // Call backend API
      const data = await login(username, password);

      // Save token + user
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("role", data.user.role);

      // Redirect by role
      if (data.user.role === "SUPERADMIN" || data.user.role === "ADMIN") {
        router.push("/dashboard");
      } else if (data.user.role === "TREASURER") {
        router.push("/treasurer");
      } else {
        router.push("/resident");
      }

    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-brand-beige p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white drop-shadow-lg rounded-xl p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-bold text-center text-brand-cyan">
          تسجيل الدخول
        </h1>

        {error && (
          <div className="text-red-600 text-sm text-center">{error}</div>
        )}

        <input
          type="text"
          placeholder="اسم المستخدم"
          className="w-full border p-3 rounded-lg text-right"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="كلمة المرور"
          className="w-full border p-3 rounded-lg text-right"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-brand-cyan text-white py-3 rounded-lg font-semibold"
        >
          دخول
        </button>
      </form>
    </div>
  );
}