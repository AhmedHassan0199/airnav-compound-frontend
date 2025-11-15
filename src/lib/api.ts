// src/lib/api.ts
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://airnav-compound.work.gd/api";

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


export async function getResidentProfile(token: string | null) {
  if (!token) {
    throw new Error("Missing token");
  }

  const res = await fetch(`${API_BASE}/resident/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Failed to load profile");
  }

  return res.json();
}


export async function getResidentInvoices(token: string | null) {
  if (!token) {
    throw new Error("Missing token");
  }

  const res = await fetch(`${API_BASE}/resident/invoices`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Failed to load invoices");
  }

  return res.json();
}

export async function adminSearchResidents(
  token: string | null,
  query: string
) {
  if (!token) throw new Error("Missing token");

  const url = `${API_BASE}/admin/residents?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load residents");
  }

  return res.json();
}

export async function adminGetResidentInvoices(
  token: string | null,
  userId: number
) {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE}/admin/residents/${userId}/invoices`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load invoices");
  }

  return res.json();
}

export async function adminCollectPayment(
  token: string | null,
  payload: {
    user_id: number;
    invoice_id: number;
    amount: number;
    method?: string;
    notes?: string;
  }
) {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE}/admin/collect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to record payment");
  }

  return res.json();
}

export async function adminCreateInvoice(
  token: string | null,
  payload: {
    user_id: number;
    year: number;
    month: number;
    amount: number;
    due_date?: string;
    notes?: string;
  }
) {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE}/admin/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to create invoice");
  }

  return res.json();
}

export async function adminDeleteInvoice(
  token: string | null,
  invoiceId: number
) {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to delete invoice");
  }

  return res.json();
}

export async function adminGetMySummary(token: string | null) {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE}/admin/me/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load admin summary");
  }

  return res.json();
}

