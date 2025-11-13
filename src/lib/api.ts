// src/lib/api.ts
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:5000/api";

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Login failed");
  }

  return res.json();
}
