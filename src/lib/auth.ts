"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UserInfo = {
  username: string;
  role: string;
};

export function useRequireAuth(allowedRoles?: string[]) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    // Not logged in → go to login
    if (!token || !username || !role) {
      router.replace("/");
      return;
    }

    // Role not allowed → redirect (you can send to / or /resident, etc.)
    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace("/");
      return;
    }

    setUser({ username, role });
    setLoading(false);
  }, [router, allowedRoles]);

  return { user, loading };
}
