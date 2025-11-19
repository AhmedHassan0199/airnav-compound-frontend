// src/lib/api.ts
import { startRequest, endRequest } from "@/lib/loaderManager";


async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  startRequest();
  try {
    const res = await fetch(input, {
      ...init,
    });

    return res;
  } finally {
    endRequest();
  }
}


export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://airnav-compound.work.gd/api";

export async function login(username: string, password: string) {
  const res = await apiFetch(`${API_BASE}/auth/login`, {
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

  const res = await apiFetch(`${API_BASE}/resident/profile`, {
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

  const res = await apiFetch(`${API_BASE}/resident/invoices`, {
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
  const res = await apiFetch(url, {
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

  const res = await apiFetch(`${API_BASE}/admin/residents/${userId}/invoices`, {
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

  const res = await apiFetch(`${API_BASE}/admin/collect`, {
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

  const res = await apiFetch(`${API_BASE}/admin/invoices`, {
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

  const res = await apiFetch(`${API_BASE}/admin/invoices/${invoiceId}`, {
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

  const res = await apiFetch(`${API_BASE}/admin/me/summary`, {
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

export async function treasurerGetAdmins(token: string | null) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/treasurer/admins`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load admins for treasurer");
  }

  return res.json();
}

export async function treasurerGetAdminDetails(
  token: string | null,
  adminId: number
) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/treasurer/admins/${adminId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load admin details");
  }

  return res.json();
}

export async function treasurerCreateSettlement(
  token: string | null,
  payload: {
    admin_id: number;
    amount: number;
    notes?: string;
  }
) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/treasurer/settlements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to record settlement");
  }

  return res.json();
}

export async function superadminCreateUser(
  token: string | null,
  payload: {
    username: string;
    password: string;
    role: "RESIDENT" | "ADMIN" | "TREASURER" | "SUPERADMIN";
    full_name?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    phone?: string; 
  }
) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to create user");
  }

  return res.json();
}

export async function treasurerGetSummary(token: string | null) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/treasurer/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load treasurer summary");
  }

  return res.json();
}

export async function treasurerCreateExpense(
  token: string | null,
  payload: { amount: number; description: string; category?: string }
) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/treasurer/expenses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to record expense");
  }

  return res.json();
}

export async function treasurerGetExpenses(token: string | null) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/treasurer/expenses`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load expenses");
  }

  return res.json();
}

export async function treasurerGetLedger(token: string | null) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/treasurer/ledger?limit=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load ledger");
  }

  return res.json();
}

export async function treasurerGetLateResidents(token: string | null) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/treasurer/late-residents`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "تعذر تحميل قائمة السكان المتأخرين");
  }

  return res.json();
}

export async function registerNotificationToken(token: string) {
  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) throw new Error("Not authenticated");

  const res = await apiFetch(`${API_BASE}/notifications/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "فشل حفظ رمز الإشعارات");
  }

  return res.json();
}

export async function sendTestNotification() {
  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) throw new Error("Not authenticated");

  const res = await apiFetch(`${API_BASE}/notifications/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "فشل إرسال الإشعار التجريبي");
  }

  return data;
}

export async function getNotificationStatus() {
  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) throw new Error("Not authenticated");

  const res = await apiFetch(`${API_BASE}/notifications/status`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "فشل جلب حالة الإشعارات");
  }

  return data as { has_subscription: boolean; subscriptions_count: number };
}

export async function treasurerNotifyLateResidents(token: string | null) {
  if (!token) throw new Error("Missing token");

  const res = await apiFetch(`${API_BASE}/treasurer/late-residents/notify-push`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "فشل إرسال الإشعارات للسكان المتأخرين");
  }

  return data as {
    total_late_residents: number;
    total_targets: number;
    total_sent: number;
    total_failed: number;
    details: any[];
  };
}

export async function submitInstapayPayment(invoiceId: number, payload: {
  transaction_ref: string;
  instapay_sender_id: string;
  amount: number;
}) {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("Not authenticated");

  const res = await apiFetch(`${API_BASE}/resident/invoices/${invoiceId}/instapay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "فشل تسجيل عملية إنستا باي");
  }

  return data;
}

export async function adminGetOnlinePaymentsPending(token: string | null) {
  if (!token) throw new Error("NO_AUTH");
  const res = await apiFetch(`${API_BASE}/admin/online_payments/pending`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "فشل تحميل المدفوعات الإلكترونية المعلقة");
  }
  return res.json();
}

export async function adminActOnOnlinePayment(
  token: string | null,
  id: number,
  action: "approve" | "reject",
  payload?: { notes?: string }
) {
  if (!token) throw new Error("NO_AUTH");
  const res = await apiFetch(
    `${API_BASE}/admin/online_payments/${id}/${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload || {}),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.message || "تعذر تنفيذ العملية على الدفع الإلكتروني"
    );
  }
  return res.json();
}
