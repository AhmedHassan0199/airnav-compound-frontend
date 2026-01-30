"use client";

import DashboardHeader from "@/components/DashboardHeader";
import { formatDateTime } from "@/lib/dateFormat";
import { useEffect, useMemo, useState } from "react";
import { useRequireAuth } from "@/lib/auth";
import type { BuildingInvoiceStat, BuildingAmountStat } from "@/lib/api";
import type { BuildingUnitStatusRow } from "@/lib/api";
import {
  treasurerGetAdmins,
  treasurerGetAdminDetails,
  treasurerCreateSettlement,
  treasurerGetSummary,
  treasurerCreateExpense,
  treasurerGetExpenses,
  treasurerGetLedger,
  treasurerGetLateResidents,
  treasurerNotifyLateResidents,
  treasurerGetBuildingInvoiceStats,
  treasurerGetBuildingAmountStats,
  treasurerGetBuildingUnitsStatus,
  treasurerCreateIncome,
  treasurerGetIncomes,
  treasurerGetLedgerStats
} from "@/lib/api";



type AdminSummary = {
  total_amount: number;
  settled_amount: number;
  outstanding_amount: number;
  payments_count: number;
};

type AdminItem = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  summary: AdminSummary;
};

type AdminDetails = {
  admin: {
    id: number;
    username: string;
    full_name: string;
  };
  summary: AdminSummary;
  recent_settlements: {
    id: number;
    amount: number;
    created_at: string;
    treasurer_name: string;
    notes: string | null;
  }[];
};

type ExpenseItem = {
  id: number;
  date: string;
  amount: number;
  category: string | null;
  description: string;
  created_by: string;
};

type LedgerEntry = {
  id: number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance_after: number;
  entry_type: string;
  created_by: string;
};

type SummaryType = {
  total_collected: number;
  total_settled: number;
  total_expenses?: number;
  union_balance: number;
  today_collected: number;
  this_month_collected: number;
  total_invoices: number;
  paid_invoices: number;
  unpaid_invoices: number;
};

type LateResident = {
  user_id: number;
  username: string;
  full_name: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  phone: string | null;
  status_flags: {
    current_month_late: boolean;
    more_than_3_months: boolean;
    partial_payments: boolean;
  };
  total_overdue_amount: number;
  overdue_months: {
    year: number;
    month: number;
    amount: number;
    paid_amount: number;
    unpaid_amount: number;
  }[];
};

type LateResidentsResponse = {
  today: string;
  cutoff_day: number;
  late_residents: LateResident[];
};

type IncomeItem = {
  id: number;
  date: string;
  amount: number;
  category: string | null;
  description: string;
  created_by: string;
};


type TabType = "SETTLEMENT" | "EXPENSES" | "INCOME" | "LEDGER" | "LATE" | "STATS";


export default function TreasurerPage() {
  useRequireAuth(["TREASURER"]);

  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<AdminItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminItem | null>(null);
  const [details, setDetails] = useState<AdminDetails | null>(null);

  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryType | null>(null);

  // Settlement form
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [savingSettlement, setSavingSettlement] = useState(false);

  // Expenses
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);

  // Ledger
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerTotals, setLedgerTotals] = useState<{ total_debit: number; total_credit: number } | null>(null);


  // Late residents
  const [lateResidents, setLateResidents] = useState<LateResident[]>([]);
  const [lateToday, setLateToday] = useState<string | null>(null);
  const [lateCutoff, setLateCutoff] = useState<number | null>(null);
  const [lateError, setLateError] = useState<string | null>(null);
  const [lateLoading, setLateLoading] = useState(false);

  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("SETTLEMENT");

  // Buildings Stats
  const [buildingStats, setBuildingStats] = useState<BuildingInvoiceStat[]>([]);
  const [buildingStatsLoading, setBuildingStatsLoading] = useState(false);
  const [buildingStatsError, setBuildingStatsError] = useState<string | null>(null);
  const [buildingStatsLoadedOnce, setBuildingStatsLoadedOnce] = useState(false);
  // فلتر سنة/شهر للـ ranking
  const [buildingStatsYear, setBuildingStatsYear] = useState<string>("");
  const [buildingStatsMonth, setBuildingStatsMonth] = useState<string>("");

  // Buildings Stats (by amount)
  const [buildingAmountStats, setBuildingAmountStats] = useState<BuildingAmountStat[]>([]);
  const [buildingAmountStatsLoading, setBuildingAmountStatsLoading] = useState(false);
  const [buildingAmountStatsError, setBuildingAmountStatsError] = useState<string | null>(null);
  const [buildingAmountLoadedOnce, setBuildingAmountLoadedOnce] = useState(false);

  // Buildings Stats filters (percentage thresholds)
  const [buildingCountFilterPct, setBuildingCountFilterPct] = useState<string>("");
  const [buildingAmountFilterPct, setBuildingAmountFilterPct] = useState<string>("");

  const [unitBuilding, setUnitBuilding] = useState("");
  const [unitRows, setUnitRows] = useState<BuildingUnitStatusRow[]>([]);
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitError, setUnitError] = useState<string | null>(null);

  const [unitPaidFilter, setUnitPaidFilter] = useState<string>(""); // "", "PAID", "UNPAID"
  const [unitMethodFilter, setUnitMethodFilter] = useState<string>(""); // "", "ONLINE", "CASH"
  const [unitSearch, setUnitSearch] = useState<string>("");

  //Income Stats
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeCategory, setIncomeCategory] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("");

  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [incomeSaving, setIncomeSaving] = useState(false);



  // Load initial data
  useEffect(() => {
    if (typeof window === "undefined") return;
    loadSummary();
    loadAdmins();
    loadExpenses();
    loadIncomes();
    loadLedger();
    loadLedgerTotals();
    loadLateResidents();
  }, []);

  async function loadSummary() {
    try {
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetSummary(token);
      setSummary(data);
    } catch {
      // ignore small errors
    }
  }

  async function loadBuildingStats() {
    try {
      setBuildingStatsError(null);
      setBuildingStatsLoading(true);
      const token = localStorage.getItem("access_token");

      const yearNum = buildingStatsYear ? parseInt(buildingStatsYear, 10) : undefined;
      const monthNum = buildingStatsMonth ? parseInt(buildingStatsMonth, 10) : undefined;

      const resp = await treasurerGetBuildingInvoiceStats(token, {
        year: yearNum,
        month: monthNum,
      });

      // resp = { year, month, buildings, top5, bottom5 }
      const rawList: any[] = Array.isArray(resp)
        ? resp
        : Array.isArray((resp as any).buildings)
        ? (resp as any).buildings
        : [];

      const normalized: BuildingInvoiceStat[] = rawList.map((b) => ({
        building: b.building,
        paid_invoices: b.paid_invoices ?? 0,
        total_apartments: b.total_apartments ?? 0,
        // هنا بنحوّل percentage → paid_percentage
        paid_percentage:
          typeof b.paid_percentage === "number"
            ? b.paid_percentage
            : typeof b.percentage === "number"
            ? b.percentage
            : 0,
      }));

      setBuildingStats(normalized);
      setBuildingStatsLoadedOnce(true);
    } catch (err: any) {
      setBuildingStatsError(
        err.message ||
          "تعذر تحميل إحصائيات نسبة الفواتير المسددة لكل عمارة"
      );
    } finally {
      setBuildingStatsLoading(false);
    }
  }

  async function loadBuildingAmountStats() {
    try {
      setBuildingAmountStatsError(null);
      setBuildingAmountStatsLoading(true);
      const token = localStorage.getItem("access_token");

      const yearNum = buildingStatsYear ? parseInt(buildingStatsYear, 10) : undefined;
      const monthNum = buildingStatsMonth ? parseInt(buildingStatsMonth, 10) : undefined;

      const data = await treasurerGetBuildingAmountStats(token, {
        year: yearNum,
        month: monthNum,
      });

      setBuildingAmountStats(data.buildings);
      setBuildingAmountLoadedOnce(true);
    } catch (err: any) {
      setBuildingAmountStatsError(
        err.message || "تعذر تحميل إحصائيات التحصيل بالمبالغ لكل عمارة"
      );
    } finally {
      setBuildingAmountStatsLoading(false);
    }
  }

  async function loadAdmins() {
    try {
      setError(null);
      setLoadingAdmins(true);
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetAdmins(token);
      setAdmins(data);
      setFilteredAdmins(data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل مسؤولي التحصيل");
    } finally {
      setLoadingAdmins(false);
    }
  }

  async function loadExpenses() {
    try {
      setExpenseError(null);
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetExpenses(token);
      setExpenses(data);
    } catch (err: any) {
      setExpenseError(err.message || "تعذر تحميل المصروفات");
    }
  }
  async function loadIncomes() {

    try {
      setIncomeLoading(true);
      setIncomeError(null);
      const token = localStorage.getItem("access_token");

      const rows = await treasurerGetIncomes(token);

      // Ensure safe mapping even if backend returns strings
      const mapped: IncomeItem[] = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        id: Number(r.id),
        date: String(r.date),
        amount: Number(r.amount || 0),
        category: r.category ?? null,
        description: String(r.description || ""),
        created_by: String(r.created_by || ""),
      }));

      setIncomes(mapped);
    } catch (err: any) {
      setIncomeError(err.message || "تعذر تحميل الإيرادات.");
      setIncomes([]);
    } finally {
      setIncomeLoading(false);
    }
  }


  async function loadLedger() {
    try {
      setLedgerError(null);
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetLedger(token);
      setLedger(data);
    } catch (err: any) {
      setLedgerError(err.message || "تعذر تحميل دفتر الاتحاد");
    }
  }
  async function loadLedgerTotals() {
  try {
    const token = localStorage.getItem("access_token");
    const data = await treasurerGetLedgerStats(token);
    setLedgerTotals({
      total_debit: Number(data.total_debit || 0),
      total_credit: Number(data.total_credit || 0),
    });
  } catch (err: any) {
    // don't break the page if stats fail
    setLedgerTotals({ total_debit: 0, total_credit: 0 });
  }
}


  async function loadLateResidents() {
    try {
      setLateError(null);
      setLateLoading(true);
      const token = localStorage.getItem("access_token");
      const data: LateResidentsResponse = await treasurerGetLateResidents(token);
      setLateResidents(data.late_residents);
      setLateToday(data.today);
      setLateCutoff(data.cutoff_day);
    } catch (err: any) {
      setLateError(err.message || "تعذر تحميل قائمة السكان المتأخرين");
    } finally {
      setLateLoading(false);
    }
  }

  async function loadBuildingUnits() {
    if (!unitBuilding.trim()) {
      setUnitError("اكتب رقم العمارة الأول");
      return;
    }
    try {
      setUnitError(null);
      setUnitLoading(true);
      const token = localStorage.getItem("access_token");

      const yearNum = buildingStatsYear ? parseInt(buildingStatsYear, 10) : undefined;
      const monthNum = buildingStatsMonth ? parseInt(buildingStatsMonth, 10) : undefined;

      const data = await treasurerGetBuildingUnitsStatus(token, {
        building: unitBuilding.trim(),
        year: yearNum,
        month: monthNum,
      });

      setUnitRows(data.units || []);
    } catch (err: any) {
      setUnitError(err.message || "تعذر تحميل شقق العمارة");
    } finally {
      setUnitLoading(false);
    }
  }

  async function handleNotifyAllLate() {
    try {
      setNotifyLoading(true);
      setNotifyMsg(null);
      setNotifyError(null);

      const token = localStorage.getItem("access_token");
      const result = await treasurerNotifyLateResidents(token);

      setNotifyMsg(
        `تم محاولة إرسال إشعارات إلى ${result.total_targets} ساكن (من أصل ${result.total_late_residents} متأخرين). ` +
          `تم الإرسال بنجاح إلى ${result.total_sent}، وفشل الإرسال إلى ${result.total_failed}.`
      );
    } catch (err: any) {
      setNotifyError(err.message || "حدث خطأ أثناء إرسال الإشعارات.");
    } finally {
      setNotifyLoading(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    const q = value.trim().toLowerCase();
    if (!q) {
      setFilteredAdmins(admins);
      return;
    }
    setFilteredAdmins(
      admins.filter((a) => {
        return (
          a.full_name.toLowerCase().includes(q) ||
          a.username.toLowerCase().includes(q)
        );
      })
    );
  }

  async function selectAdmin(admin: AdminItem) {
    setSelectedAdmin(admin);
    setDetails(null);
    setAmount("");
    setNotes("");

    try {
      setLoadingAdmins(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      const data = await treasurerGetAdminDetails(token, admin.id);
      setDetails(data);

      const outstanding = data.summary.outstanding_amount;
      if (outstanding > 0) {
        setAmount(outstanding.toFixed(2));
      } else {
        setAmount("");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل بيانات المسؤول");
    } finally {
      setLoadingAdmins(false);
    }
  }

  async function submitSettlement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAdmin || !details) return;

    const outstanding = details.summary.outstanding_amount;
    if (!amount) {
      alert("برجاء إدخال مبلغ التسوية.");
      return;
    }
    const value = parseFloat(amount);
    if (value <= 0) {
      alert("المبلغ يجب أن يكون أكبر من صفر.");
      return;
    }
    if (value > outstanding + 1e-6) {
      alert(
        `المبلغ المدخل أكبر من الرصيد المطلوب تسويته (${outstanding.toFixed(
          2
        )} جنيه).`
      );
      return;
    }

    try {
      setSavingSettlement(true);
      const token = localStorage.getItem("access_token");
      const result = await treasurerCreateSettlement(token, {
        admin_id: selectedAdmin.id,
        amount: value,
        notes: notes || undefined,
      });

      const newSummary = result.summary as AdminSummary;

      setDetails((prev) =>
        prev
          ? {
              ...prev,
              summary: newSummary,
            }
          : prev
      );

      setAdmins((prev) =>
        prev.map((a) =>
          a.id === selectedAdmin.id ? { ...a, summary: newSummary } : a
        )
      );
      setFilteredAdmins((prev) =>
        prev.map((a) =>
          a.id === selectedAdmin.id ? { ...a, summary: newSummary } : a
        )
      );

      setNotes("");
      const newOutstanding = newSummary.outstanding_amount;
      if (newOutstanding > 0) {
        setAmount(newOutstanding.toFixed(2));
      } else {
        setAmount("");
      }

      const data = await treasurerGetAdminDetails(token, selectedAdmin.id);
      setDetails(data);

      await loadSummary();
      await loadLedger();
      await loadLedgerTotals();
    } catch (err: any) {
      alert(err.message || "تعذر تسجيل التسوية");
    } finally {
      setSavingSettlement(false);
    }
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseAmount || !expenseDescription) {
      setExpenseError("برجاء إدخال مبلغ المصروف والوصف.");
      return;
    }

    const value = parseFloat(expenseAmount);
    if (isNaN(value) || value <= 0) {
      setExpenseError("برجاء إدخال مبلغ صحيح أكبر من صفر.");
      return;
    }

    try {
      setExpenseSaving(true);
      setExpenseError(null);
      const token = localStorage.getItem("access_token");

      await treasurerCreateExpense(token, {
        amount: value,
        description: expenseDescription,
        category: expenseCategory || undefined,
      });

      setExpenseAmount("");
      setExpenseCategory("");
      setExpenseDescription("");

      await loadExpenses();
      await loadSummary();
      await loadLedger();
      await loadLedgerTotals();
    } catch (err: any) {
      setExpenseError(err.message || "تعذر تسجيل المصروف.");
    } finally {
      setExpenseSaving(false);
    }
  }

  async function submitIncome(e: React.FormEvent) {
    e.preventDefault();

    if (!incomeAmount || !incomeDescription) {
      setIncomeError("برجاء إدخال مبلغ الإيراد والوصف.");
      return;
    }

    const value = parseFloat(incomeAmount);
    if (isNaN(value) || value <= 0) {
      setIncomeError("برجاء إدخال مبلغ صحيح أكبر من صفر.");
      return;
    }

    try {
      setIncomeSaving(true);
      setIncomeError(null);
      
      const token = localStorage.getItem("access_token");
      await treasurerCreateIncome(token, {
        amount: value,
        description: incomeDescription.trim(),
        category: incomeCategory.trim() || undefined,
      });

      setIncomeAmount("");
      setIncomeCategory("");
      setIncomeDescription("");

      // refresh relevant views
      await loadIncomes();
      await loadSummary();
      await loadLedger();
      await loadLedgerTotals();
    } catch (err: any) {
      setIncomeError(err.message || "تعذر تسجيل الإيراد.");
    } finally {
      setIncomeSaving(false);
    }
  }


  // Basic stats from ledger
  const ledgerStats = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    ledger.forEach((e) => {
      totalDebit += e.debit || 0;
      totalCredit += e.credit || 0;
    });
    return {
      totalDebit,
      totalCredit,
    };
  }, [ledger]);

  // ===== Derived data for Advanced Stats tab (no charts lib) =====

  const invoicesStats = useMemo(() => {
    if (!summary) return null;
    const total = summary.total_invoices || 0;
    const paid = summary.paid_invoices || 0;
    const unpaid = summary.unpaid_invoices || 0;
    const paidPct = total ? (paid / total) * 100 : 0;
    return { total, paid, unpaid, paidPct };
  }, [summary]);

  const topAdminsData = useMemo(() => {
    const list = admins
      .slice()
      .sort(
        (a, b) => b.summary.total_amount - a.summary.total_amount
      )
      .slice(0, 5);
    const maxTotal =
      list.length > 0
        ? Math.max(...list.map((a) => a.summary.total_amount))
        : 0;
    return { list, maxTotal };
  }, [admins]);

  const topOverdueResidents = useMemo(() => {
    const list = lateResidents
      .slice()
      .sort(
        (a, b) => b.total_overdue_amount - a.total_overdue_amount
      )
      .slice(0, 5);
    const maxOverdue =
      list.length > 0
        ? Math.max(...list.map((r) => r.total_overdue_amount))
        : 0;
    return { list, maxOverdue };
  }, [lateResidents]);

  const buildingsRanking = useMemo(() => {
  const base = Array.isArray(buildingStats) ? buildingStats : [];

  if (base.length === 0) {
    return { all: [], maxPct: 0 };
  }

  const sorted = base
    .slice()
    .sort((a, b) => b.paid_percentage - a.paid_percentage);

  const maxPct = sorted[0]?.paid_percentage || 0;

  return { all: sorted, maxPct };
}, [buildingStats]);

  const buildingsAmountRanking = useMemo(() => {
  if (!buildingAmountStats || buildingAmountStats.length === 0) {
    return { all: [], maxPct: 0 };
  }

  const sorted = buildingAmountStats
    .slice()
    .sort((a, b) => b.paid_percentage - a.paid_percentage);

  const maxPct = sorted[0]?.paid_percentage || 0;

  return { all: sorted, maxPct };
}, [buildingAmountStats]);

  const statsOverdueRate = useMemo(() => {
    if (!summary || !summary.total_invoices) return 0;
    const unpaid = summary.unpaid_invoices || 0;
    return (unpaid / summary.total_invoices) * 100;
  }, [summary]);

  const filteredUnitRows = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();

    return unitRows.filter(r => {
      if (unitPaidFilter === "PAID" && !r.paid_current_month) return false;
      if (unitPaidFilter === "UNPAID" && r.paid_current_month) return false;

      if (unitMethodFilter && (r.payment_method || "") !== unitMethodFilter) return false;

      if (q) {
        const blob = `${r.full_name} ${r.floor ?? ""} ${r.apartment ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [unitRows, unitPaidFilter, unitMethodFilter, unitSearch]);


  function buildWhatsAppLink(resident: LateResident) {
    if (!resident.phone) return "#";

    const cleanPhone = resident.phone.replace(/[^0-9]/g, "");
    const message = `السلام عليكم،
هذا تنبيه من اتحاد شاغلين مدينة الملاحة الجوية بوجود مديونية صيانة على وحدتكم.

إجمالي المديونية الحالية: ${resident.total_overdue_amount.toFixed(
      2
    )} جنيه.

برجاء التكرم بالسداد في أقرب وقت، أو التواصل مع أمين الصندوق للاستفسار.`;
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  function printLateResidentsList() {
    if (!lateResidents.length) {
      alert("لا يوجد سكان متأخرون حالياً.");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;

    const rowsHtml = lateResidents
      .map((r, idx) => {
        const flags: string[] = [];
        if (r.status_flags.current_month_late) flags.push("متأخر عن الشهر الحالي");
        if (r.status_flags.more_than_3_months)
          flags.push("مديونية أكثر من ٣ أشهر");
        if (r.status_flags.partial_payments) flags.push("سداد جزئي");

        const months = r.overdue_months
          .map(
            (m) =>
              `${m.month}/${m.year} - الباقي: ${m.unpaid_amount.toFixed(2)} ج`
          )
          .join(" | ");

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${r.full_name}</td>
            <td>${r.building ?? "-"}/${r.floor ?? "-"}/${r.apartment ?? "-"}</td>
            <td>${r.total_overdue_amount.toFixed(2)}</td>
            <td>${flags.join(" - ") || "-"}</td>
            <td>${months}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>قائمة السكان المتأخرين</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: right; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>قائمة السكان المتأخرين عن سداد الصيانة</h1>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>العمارة/الدور/الشقة</th>
                <th>إجمالي المديونية (جنيه)</th>
                <th>الحالة</th>
                <th>الأشهر المتأخرة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <main className="min-h-screen bg-brand-beige p-4" dir="rtl">
      <DashboardHeader title="لوحة تحكم أمين الصندوق" />

      {/* Summary cards only for Ledger & Stats tabs */}
      {summary &&
        (activeTab === "STATS") && (
          <div className="max-w-6xl mx-auto mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg shadow-sm p-3">
                <div className="text-xs text-slate-600">رصيد الاتحاد الحالي</div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {summary.union_balance.toFixed(2)} جنيه
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-3">
                <div className="text-xs text-slate-600">
                  تحصيل شهر {new Date().getMonth() + 1}
                </div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {summary.this_month_collected.toFixed(2)} جنيه
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-3">
                <div className="text-xs text-slate-600">تحصيل اليوم</div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {summary.today_collected.toFixed(2)} جنيه
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-3">
                <div className="text-xs text-slate-600">
                  فواتير مدفوعة / إجمالي
                </div>
                <div className="text-lg font-bold text-slate-800 mt-1">
                  {summary.paid_invoices} / {summary.total_invoices}
                </div>
              </div>
            </div>
          </div>
        )}

      <div className="max-w-6xl mx-auto space-y-4">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setActiveTab("SETTLEMENT")}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "SETTLEMENT"
                ? "bg-brand-cyan text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            تسويات مسؤولي التحصيل
          </button>
          <button
            onClick={() => setActiveTab("EXPENSES")}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "EXPENSES"
                ? "bg-brand-cyan text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            مصروفات الاتحاد
          </button>
          <button
            onClick={() => setActiveTab("INCOME")}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "INCOME"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            إيرادات الاتحاد
          </button>
          <button
            onClick={() => setActiveTab("LEDGER")}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "LEDGER"
                ? "bg-brand-cyan text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            دفتر الاتحاد والإحصائيات
          </button>
          <button
            onClick={() => setActiveTab("LATE")}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "LATE"
                ? "bg-brand-cyan text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            السكان المتأخرين
          </button>
          <button
            onClick={async () => {
              setActiveTab("STATS");
              if (!buildingStatsLoadedOnce) {
                await loadBuildingStats();
              }
              if (!buildingAmountLoadedOnce) {
                await loadBuildingAmountStats();
              }
            }}
            className={`px-3 py-2 rounded-lg ${
              activeTab === "STATS"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            لوحة الإحصائيات المتقدمة
          </button>
        </div>

        {/* TAB 1: Admin Settlements */}
        {activeTab === "SETTLEMENT" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  تسويات مسؤولي التحصيل
                </h1>
                <p className="text-sm text-slate-600">
                  استعرض أرصدة مسؤولي التحصيل وسجّل التسويات النقدية معهم.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  بحث عن مسؤول تحصيل
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-sm text-right"
                  placeholder="الاسم أو اسم المستخدم"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Admin list */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-3 space-y-3">
                <h2 className="text-sm font-semibold text-slate-800 mb-1">
                  مسؤولو التحصيل
                </h2>
                {loadingAdmins && admins.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    جارٍ تحميل البيانات...
                  </p>
                ) : filteredAdmins.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    لا توجد نتائج. جرّب تعديل البحث.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {filteredAdmins.map((admin) => (
                      <button
                        key={admin.id}
                        className={`w-full text-right border rounded-lg p-3 text-sm hover:bg-slate-50 transition ${
                          selectedAdmin?.id === admin.id
                            ? "border-brand-cyan bg-slate-50"
                            : "border-slate-200"
                        }`}
                        onClick={() => selectAdmin(admin)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-800">
                              {admin.full_name}
                            </div>
                            <div className="text-xs text-slate-600">
                              اسم المستخدم: {admin.username}
                            </div>
                          </div>

                          {admin.role === "ONLINE_ADMIN" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                              اونلاين
                            </span>
                          )}
                        </div>

                        <div className="text-xs mt-1">
                          <span className="text-slate-600">
                            رصيد مطلوب تسويته:{" "}
                          </span>
                          <span
                            className={
                              admin.summary.outstanding_amount > 0
                                ? "text-orange-700 font-semibold"
                                : "text-green-700 font-semibold"
                            }
                          >
                            {admin.summary.outstanding_amount.toFixed(2)} جنيه
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details + settlement */}
              <div className="lg:col-span-2 space-y-3">
                <div className="bg-white rounded-xl shadow-sm p-3">
                  <h2 className="text-sm font-semibold text-slate-800 mb-2">
                    تفاصيل مسؤول التحصيل
                  </h2>
                  {!selectedAdmin ? (
                    <p className="text-sm text-slate-600">
                      اختر مسؤول تحصيل من القائمة لعرض تفاصيله.
                    </p>
                  ) : loadingAdmins && !details ? (
                    <p className="text-sm text-slate-600">
                      جارٍ تحميل تفاصيل {selectedAdmin.full_name}...
                    </p>
                  ) : !details ? (
                    <p className="text-sm text-slate-600">
                      لم يتم تحميل التفاصيل. حاول مرة أخرى.
                    </p>
                  ) : (
                    <>
                      {/* Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div className="border rounded-lg p-3 bg-slate-50">
                          <div className="text-xs text-slate-600">
                            إجمالي المبالغ المحصلة بواسطة هذا المسؤول
                          </div>
                          <div className="text-lg font-bold text-slate-800 mt-1">
                            {details.summary.total_amount.toFixed(2)} جنيه
                          </div>
                        </div>
                        <div className="border rounded-lg p-3 bg-slate-50">
                          <div className="text-xs text-slate-600">
                            المبالغ المسددة للخزينة
                          </div>
                          <div className="text-lg font-bold text-slate-800 mt-1">
                            {details.summary.settled_amount.toFixed(2)} جنيه
                          </div>
                        </div>
                        <div className="border rounded-lg p-3 bg-slate-50">
                          <div className="text-xs text-slate-600">
                            الرصيد المطلوب تسويته
                          </div>
                          <div className="text-lg font-bold text-orange-700 mt-1">
                            {details.summary.outstanding_amount.toFixed(2)} جنيه
                          </div>
                        </div>
                        <div className="border rounded-lg p-3 bg-slate-50">
                          <div className="text-xs text-slate-600">
                            عدد الفواتير المحصلة
                          </div>
                          <div className="text-lg font-bold text-slate-800 mt-1">
                            {details.summary.payments_count}
                          </div>
                        </div>
                      </div>

                      {/* Settlement form */}
                      <div className="border rounded-lg p-3 mb-4">
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">
                          تسجيل تسوية جديدة
                        </h3>
                        {details.summary.outstanding_amount <= 0 ? (
                          <p className="text-sm text-green-700">
                            لا يوجد رصيد مستحق على هذا المسؤول حالياً.
                          </p>
                        ) : (
                          <form
                            onSubmit={submitSettlement}
                            className="space-y-3 text-sm max-w-md"
                          >
                            <div>
                              <label className="block mb-1 text-slate-700">
                                المبلغ المسلّم (جنيه)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full border rounded-lg px-3 py-2 text-right"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                لا يمكن أن يزيد عن الرصيد المطلوب تسويته (
                                {details.summary.outstanding_amount.toFixed(2)}{" "}
                                جنيه).
                              </p>
                            </div>
                            <div>
                              <label className="block mb-1 text-slate-700">
                                ملاحظات (اختياري)
                              </label>
                              <textarea
                                className="w-full border rounded-lg px-3 py-2 text-right text-sm"
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="مثال: تسوية عن شهر سبتمبر بالكامل."
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={savingSettlement}
                              className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                            >
                              {savingSettlement
                                ? "جارٍ الحفظ..."
                                : "تسجيل التسوية"}
                            </button>
                          </form>
                        )}
                      </div>

                      {/* Recent settlements */}
                      <div className="border rounded-lg p-3">
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">
                          آخر التسويات المسجلة
                        </h3>
                        {details.recent_settlements.length === 0 ? (
                          <p className="text-sm text-slate-600">
                            لا توجد تسويات مسجلة لهذا المسؤول حتى الآن.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 text-sm">
                            {details.recent_settlements.map((s) => (
                              <div
                                key={s.id}
                                className="border rounded-lg p-3 bg-slate-50"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-800">
                                    {s.amount.toFixed(2)} جنيه
                                  </span>
                                  <span className="text-xs text-slate-600">
                                    {s.created_at}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                  مسجّلة بواسطة: {s.treasurer_name}
                                </div>
                                {s.notes && (
                                  <div className="text-xs text-slate-600 mt-1">
                                    ملاحظات: {s.notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        {/* TAB: Income */}
        {activeTab === "INCOME" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                تسجيل إيراد للاتحاد
              </h2>

              {incomeError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 mb-2">
                  {incomeError}
                </div>
              )}

              <form onSubmit={submitIncome} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-600">المبلغ (جنيه)</label>
                  <input
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    placeholder="مثال: 500"
                    className="border rounded-lg px-3 py-2 text-right"
                    inputMode="decimal"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-600">تصنيف (اختياري)</label>
                  <input
                    value={incomeCategory}
                    onChange={(e) => setIncomeCategory(e.target.value)}
                    placeholder="مثال: إيجار / إعلان / ..."
                    className="border rounded-lg px-3 py-2 text-right"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-600">الوصف</label>
                  <input
                    value={incomeDescription}
                    onChange={(e) => setIncomeDescription(e.target.value)}
                    placeholder="مثال: إيجار شقة 12 دور 3"
                    className="border rounded-lg px-3 py-2 text-right"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={incomeSaving}
                    className={`px-4 py-2 rounded-lg text-white ${
                      incomeSaving ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {incomeSaving ? "جارٍ الحفظ..." : "تسجيل الإيراد"}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-800">
                  آخر الإيرادات
                </h3>
                <button
                  type="button"
                  onClick={loadIncomes}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs"
                >
                  تحديث
                </button>
              </div>

              {incomeLoading ? (
                <p className="text-sm text-slate-600">جارٍ التحميل...</p>
              ) : incomes.length === 0 ? (
                <p className="text-sm text-slate-600">لا توجد إيرادات مسجلة حتى الآن.</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 text-xs sm:text-sm">
                  {incomes.map((inc) => (
                    <div
                      key={inc.id}
                      className="border rounded-lg p-3 bg-slate-50 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">
                          {formatDateTime(inc.date)}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">
                          +{inc.amount.toFixed(2)} جنيه
                        </span>
                      </div>

                      <div className="text-slate-800 font-semibold">
                        {inc.description}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        {inc.category && (
                          <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                            {inc.category}
                          </span>
                        )}
                        <span>مسجّل بواسطة: {inc.created_by}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Expenses */}
        {activeTab === "EXPENSES" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense form */}
            <div className="bg-white rounded-xl shadow-sm p-3 space-y-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                إضافة مصروف اتحاد جديد
              </h2>
              {expenseError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 mb-2">
                  {expenseError}
                </div>
              )}
              <form
                onSubmit={submitExpense}
                className="space-y-3 text-sm max-w-md"
              >
                <div>
                  <label className="block mb-1 text-slate-700">
                    المبلغ (جنيه)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded-lg px-3 py-2 text-right"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">
                    التصنيف (اختياري)
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-right"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    placeholder="مثال: نظافة، أمن، صيانة..."
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">
                    الوصف / البيان
                  </label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-right text-sm"
                    rows={2}
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="مثال: مصروف صيانة الأعمدة الكهربائية."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={expenseSaving}
                  className="px-4 py-2 bg-brand-cyan text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {expenseSaving ? "جارٍ الحفظ..." : "تسجيل المصروف"}
                </button>
              </form>
            </div>

            {/* Expense list */}
            <div className="bg-white rounded-xl shadow-sm p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                آخر المصروفات المسجلة
              </h2>
              {expenses.length === 0 ? (
                <p className="text-sm text-slate-600">
                  لا توجد مصروفات مسجلة حتى الآن.
                </p>
              ) : (
                <div className="max-h-[40vh] overflow-y-auto pr-1 text-xs sm:text-sm">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b text-[11px] sm:text-xs text-slate-600">
                        <th className="py-1">التاريخ</th>
                        <th className="py-1">البيان</th>
                        <th className="py-1">التصنيف</th>
                        <th className="py-1">المبلغ</th>
                        <th className="py-1">مسجّل بواسطة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp) => (
                        <tr key={exp.id} className="border-b last:border-0">
                          <td className="py-1 align-top">{formatDateTime(exp.date)}</td>
                          <td className="py-1 align-top">{exp.description}</td>
                          <td className="py-1 align-top">
                            {exp.category || "-"}
                          </td>
                          <td className="py-1 align-top">
                            {exp.amount.toFixed(2)}
                          </td>
                          <td className="py-1 align-top">{exp.created_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Ledger & basic stats */}
        {activeTab === "LEDGER" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                إحصائيات دفتر الاتحاد
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="text-xs text-slate-600">إجمالي الإيداعات</div>
                  <div className="text-lg font-bold text-green-700 mt-1">
                    {(ledgerTotals?.total_credit ?? 0).toFixed(2)} جنيه
                  </div>
                </div>
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="text-xs text-slate-600">
                    إجمالي المصروفات (مدين)
                  </div>
                  <div className="text-lg font-bold text-red-700 mt-1">
                    {(ledgerTotals?.total_debit ?? 0).toFixed(2)} جنيه
                  </div>
                </div>
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="text-xs text-slate-600">الرصيد الحالي</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {summary?.union_balance.toFixed(2) ?? "0.00"} جنيه
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                الرصيد الحالي يجب أن يساوي آخر قيمة (الرصيد بعد القيد) في
                القائمة بالأسفل.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                كل الحركات المالية (دفتر الاتحاد)
              </h2>
              {ledgerError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 mb-2">
                  {ledgerError}
                </div>
              )}
              {ledger.length === 0 ? (
                <p className="text-sm text-slate-600">
                  لا توجد قيود مالية مسجلة حتى الآن.
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 text-xs sm:text-sm">
                  {ledger.map((entry) => {
                    const isCredit = entry.credit > 0;
                    const amount = isCredit ? entry.credit : entry.debit;
                    return (
                      <div
                        key={entry.id}
                        className="border rounded-lg p-3 bg-slate-50 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">
                            {formatDateTime(entry.date)}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              isCredit
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {isCredit ? "+ إيداع" : "- مصروف"}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800">
                          {entry.description}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-700 mt-1">
                          <span>
                            المبلغ:{" "}
                            <span
                              className={
                                isCredit ? "text-green-700" : "text-red-700"
                              }
                            >
                              {isCredit
                                ? `+${amount.toFixed(2)}`
                                : `-${amount.toFixed(2)}`}{" "}
                              جنيه
                            </span>
                          </span>
                          <span>
                            الرصيد بعد القيد:{" "}
                            <span className="font-semibold text-slate-900">
                              {entry.balance_after.toFixed(2)} جنيه
                            </span>
                          </span>
                          <span>مسجّل بواسطة: {entry.created_by}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Late Residents */}
        {activeTab === "LATE" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 mb-1">
                  قائمة السكان المتأخرين عن السداد
                </h2>
                <p className="text-xs text-slate-600">
                  يظهر هنا أي ساكن: لم يدفع بعد اليوم الخامس من الشهر الحالي،
                  أو عليه مديونية لأكثر من ٣ أشهر، أو قام بسداد جزئي فقط.
                </p>
                {lateToday && (
                  <p className="text-xs text-slate-500 mt-1">
                    تاريخ التقييم: {lateToday} – بعد اليوم رقم{" "}
                    {lateCutoff ?? 5} من كل شهر يتم اعتبار الشهر متأخر.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={loadLateResidents}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs sm:text-sm"
                >
                  تحديث القائمة
                </button>
                <button
                  onClick={printLateResidentsList}
                  className="px-3 py-2 rounded-lg bg-brand-cyan text-white text-xs sm:text-sm"
                >
                  طباعة / حفظ PDF
                </button>
                <button
                  onClick={handleNotifyAllLate}
                  disabled={notifyLoading}
                  className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs sm:text-sm disabled:opacity-60"
                >
                  {notifyLoading
                    ? "جارٍ إرسال الإشعارات..."
                    : "إرسال إشعارات للسكان المتأخرين"}
                </button>
              </div>
            </div>

            {lateError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {lateError}
              </div>
            )}

            {notifyMsg && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg p-2 mt-2">
                {notifyMsg}
              </div>
            )}
            {notifyError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 mt-2">
                {notifyError}
              </div>
            )}

            {lateLoading ? (
              <div className="bg-white rounded-xl shadow-sm p-3 text-sm text-slate-600">
                جارٍ تحميل قائمة السكان المتأخرين...
              </div>
            ) : lateResidents.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-3 text-sm text-green-700">
                لا يوجد سكان متأخرون حالياً. 👌
              </div>
            ) : (
              <div className="space-y-3">
                {lateResidents.map((r) => {
                  const flags: string[] = [];
                  if (r.status_flags.current_month_late)
                    flags.push("متأخر عن الشهر الحالي");
                  if (r.status_flags.more_than_3_months)
                    flags.push("مديونية أكثر من ٣ أشهر");
                  if (r.status_flags.partial_payments)
                    flags.push("سداد جزئي");

                  return (
                    <div
                      key={r.user_id}
                      className="bg-white rounded-xl shadow-sm p-3 flex flex-col gap-2"
                    >
                      <div className="flex flex-col sm:flex-row justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-800">
                            {r.full_name}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            عمارة {r.building ?? "-"} – دور {r.floor ?? "-"} – شقة{" "}
                            {r.apartment ?? "-"}
                          </div>
                          {r.phone && (
                            <div className="text-xs text-slate-600 mt-1">
                              رقم الموبايل: {r.phone}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-right">
                          <div className="text-xs text-slate-600">
                            إجمالي المديونية
                          </div>
                          <div className="text-lg font-bold text-red-700">
                            {r.total_overdue_amount.toFixed(2)} جنيه
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs mt-1">
                        {flags.map((f) => (
                          <span
                            key={f}
                            className="px-2 py-1 rounded-full bg-orange-100 text-orange-800"
                          >
                            {f}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2 border-t pt-2 text-[11px] sm:text-xs text-slate-700">
                        <div className="font-semibold mb-1">
                          الأشهر المتأخرة:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {r.overdue_months.map((m, idx) => (
                            <div
                              key={`${r.user_id}-${m.year}-${m.month}-${idx}`}
                              className="border rounded-lg px-2 py-1 bg-slate-50"
                            >
                              <div>
                                {m.month}/{m.year}
                              </div>
                              <div>
                                المبلغ: {m.amount.toFixed(2)} – المدفوع:{" "}
                                {m.paid_amount.toFixed(2)} – الباقي:{" "}
                                {m.unpaid_amount.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {r.phone && (
                          <a
                            href={buildWhatsAppLink(r)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs"
                          >
                            إرسال تذكير عبر واتساب
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Advanced Stats Dashboard (no Recharts) */}
        {activeTab === "STATS" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                لوحة الإحصائيات المتقدمة
              </h2>
              <p className="text-xs text-slate-600">
                هذه الصفحة تعرض رؤية عامة عن حالة الاتحاد، التحصيل، المصروفات،
                الفواتير، والمتأخرات بشكل مبسّط وسهل القراءة.
              </p>
            </div>

            {/* Top strip with summary cards is already shown above for STATS */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Invoices status + overdue rate */}
              <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  حالة الفواتير
                </h3>
                {invoicesStats ? (
                  <>
                    <div className="flex justify-between text-xs text-slate-700">
                      <span>إجمالي الفواتير:</span>
                      <span className="font-semibold">
                        {invoicesStats.total}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-green-700">
                      <span>فواتير مسددة:</span>
                      <span className="font-semibold">
                        {invoicesStats.paid}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-red-700">
                      <span>فواتير غير مسددة:</span>
                      <span className="font-semibold">
                        {invoicesStats.unpaid}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                        <span>نسبة الفواتير المسددة</span>
                        <span className="font-semibold text-emerald-700">
                          {invoicesStats.paidPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, invoicesStats.paidPct)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                        <span>نسبة الفواتير المتأخرة / غير المسددة</span>
                        <span className="font-semibold text-red-700">
                          {statsOverdueRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, statsOverdueRate)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">
                    لا توجد بيانات كافية عن الفواتير حتى الآن.
                  </p>
                )}
              </div>

              {/* Top collecting admins */}
              <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  أفضل مسؤولي تحصيل
                </h3>
                {topAdminsData.list.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    لا توجد بيانات تحصيل لمسؤولي التحصيل حتى الآن.
                  </p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {topAdminsData.list.map((a) => {
                      const percent =
                        topAdminsData.maxTotal > 0
                          ? (a.summary.total_amount /
                              topAdminsData.maxTotal) *
                            100
                          : 0;
                      return (
                        <div
                          key={a.id}
                          className="border rounded-lg p-2 bg-slate-50 flex flex-col gap-1"
                        >
                          <div className="flex justify-between">
                            <div className="font-semibold text-slate-800">
                              {a.full_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {a.role === "ONLINE_ADMIN"
                                ? "تحصيل أونلاين"
                                : "تحصيل نقدي"}
                            </div>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>إجمالي التحصيل:</span>
                            <span className="font-semibold text-emerald-700">
                              {a.summary.total_amount.toFixed(2)} جنيه
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>الرصيد المطلوب تسويته:</span>
                            <span
                              className={
                                a.summary.outstanding_amount > 0
                                  ? "font-semibold text-orange-700"
                                  : "font-semibold text-green-700"
                              }
                            >
                              {a.summary.outstanding_amount.toFixed(2)} جنيه
                            </span>
                          </div>
                          <div className="w-full h-2 mt-1 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, percent)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Top overdue units */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">
                أعلى الوحدات من حيث المديونية
              </h3>
              {topOverdueResidents.list.length === 0 ? (
                <p className="text-sm text-slate-600">
                  حتى الآن لا توجد وحدات ذات مديونية عالية مسجلة.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {topOverdueResidents.list.map((r) => {
                    const percent =
                      topOverdueResidents.maxOverdue > 0
                        ? (r.total_overdue_amount /
                            topOverdueResidents.maxOverdue) *
                          100
                        : 0;
                    return (
                      <div
                        key={r.user_id}
                        className="border rounded-lg p-3 bg-slate-50 flex flex-col gap-1"
                      >
                        <div className="font-semibold text-slate-800">
                          {r.full_name}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          عمارة {r.building ?? "-"} – دور {r.floor ?? "-"} – شقة{" "}
                          {r.apartment ?? "-"}
                        </div>
                        <div className="flex justify-between text-[11px] mt-1">
                          <span>إجمالي المديونية:</span>
                          <span className="font-semibold text-red-700">
                            {r.total_overdue_amount.toFixed(2)} جنيه
                          </span>
                        </div>
                        <div className="w-full h-2 mt-1 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, percent)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NEW: ترتيب العمارات حسب عدد الفواتير */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    ترتيب العمارات حسب نسبة الفواتير المسددة (PAID)
                  </h3>
                  <p className="text-xs text-slate-600">
                    يتم حساب نسبة التحصيل لكل عمارة كالتالي:
                    عدد الفواتير المسددة ÷ عدد الشقق (أقصى رقم شقة × ٧ أدوار).
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                  <input
                    type="number"
                    className="border rounded-lg px-2 py-1 text-right w-24"
                    placeholder="السنة"
                    value={buildingStatsYear}
                    onChange={(e) => setBuildingStatsYear(e.target.value)}
                  />
                  <select
                    className="border rounded-lg px-2 py-1 text-right w-28"
                    value={buildingStatsMonth}
                    onChange={(e) => setBuildingStatsMonth(e.target.value)}
                  >
                    <option value="">كل الشهور</option>
                    <option value="1">يناير</option>
                    <option value="2">فبراير</option>
                    <option value="3">مارس</option>
                    <option value="4">أبريل</option>
                    <option value="5">مايو</option>
                    <option value="6">يونيو</option>
                    <option value="7">يوليو</option>
                    <option value="8">أغسطس</option>
                    <option value="9">سبتمبر</option>
                    <option value="10">أكتوبر</option>
                    <option value="11">نوفمبر</option>
                    <option value="12">ديسمبر</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      loadBuildingStats();
                      loadBuildingAmountStats();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white"
                  >
                    تحديث الترتيب
                  </button>
                </div>
              </div>

              {buildingStatsLoading && (
                <p className="text-sm text-slate-600">جارٍ تحميل بيانات العمارات...</p>
              )}

              {buildingStatsError && (
                <p className="text-sm text-red-600">{buildingStatsError}</p>
              )}

              {!buildingStatsLoading &&
                !buildingStatsError &&
                buildingStats.length > 0 && (
                  <>
                    {/* Filter controls for count-based % */}
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm mt-3 mb-2">
                      <span className="text-slate-700">
                        فلترة حسب النسبة:
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        step={1}
                        className="border rounded-lg px-2 py-1 text-right w-28"
                        placeholder="مثال: 70"
                        value={buildingCountFilterPct}
                        onChange={(e) => setBuildingCountFilterPct(e.target.value)}
                      />
                      <span className="text-slate-500">
                        إظهار العمارات أقل من أو تساوي هذه النسبة %
                      </span>
                      <button
                        type="button"
                        onClick={() => setBuildingCountFilterPct("")}
                        className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700"
                      >
                        إلغاء الفلتر
                      </button>
                      <button
                        type="button"
                        onClick={() => setBuildingCountFilterPct("70")}
                        className="px-2 py-1 rounded-lg bg-orange-100 text-orange-800"
                      >
                        أقل من 70%
                      </button>
                    </div>

                    {/* Table with ALL buildings (after filter) */}
                    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
                      <table className="w-full text-xs sm:text-sm text-right border-collapse">
                        <thead className="bg-slate-50">
                          <tr className="border-b">
                            <th className="py-2 px-2">#</th>
                            <th className="py-2 px-2">العمارة</th>
                            <th className="py-2 px-2">الفواتير المسددة / الشقق</th>
                            <th className="py-2 px-2">نسبة التحصيل</th>
                            <th className="py-2 px-2">تمثيل بصري</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const threshold = parseFloat(buildingCountFilterPct);
                            const rows =
                              !isNaN(threshold)
                                ? buildingsRanking.all.filter(
                                    (b) => (b.paid_percentage ?? 0) <= threshold
                                  )
                                : buildingsRanking.all;

                            return rows.map((b, idx) => {
                              const label = b.building || "عمارة غير محددة";
                              const pct = b.paid_percentage ?? 0;
                              const widthPct = Math.min(100, Math.max(0, pct));

                              return (
                                <tr key={label} className="border-b last:border-0">
                                  <td className="py-1.5 px-2">{idx + 1}</td>
                                  <td className="py-1.5 px-2">{label}</td>
                                  <td className="py-1.5 px-2">
                                    {b.paid_invoices}/{b.total_apartments}
                                  </td>
                                  <td className="py-1.5 px-2 font-semibold">
                                    {pct.toFixed(1)}%
                                  </td>
                                  <td className="py-1.5 px-2">
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-500"
                                        style={{ width: `${widthPct}%` }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}


              {!buildingAmountStatsLoading &&
                !buildingAmountStatsError &&
                buildingAmountStats.length > 0 && (
                  <>
                    {/* Filter controls for amount-based % */}
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm mt-3 mb-2">
                      <span className="text-slate-700">
                        فلترة حسب النسبة:
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        step={1}
                        className="border rounded-lg px-2 py-1 text-right w-28"
                        placeholder="مثال: 70"
                        value={buildingAmountFilterPct}
                        onChange={(e) => setBuildingAmountFilterPct(e.target.value)}
                      />
                      <span className="text-slate-500">
                        إظهار العمارات أقل من أو تساوي هذه النسبة %
                      </span>
                      <button
                        type="button"
                        onClick={() => setBuildingAmountFilterPct("")}
                        className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700"
                      >
                        إلغاء الفلتر
                      </button>
                      <button
                        type="button"
                        onClick={() => setBuildingAmountFilterPct("70")}
                        className="px-2 py-1 rounded-lg bg-orange-100 text-orange-800"
                      >
                        أقل من 70%
                      </button>
                    </div>

                    {/* Table with ALL buildings (after filter) */}
                    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
                      <table className="w-full text-xs sm:text-sm text-right border-collapse">
                        <thead className="bg-slate-50">
                          <tr className="border-b">
                            <th className="py-2 px-2">#</th>
                            <th className="py-2 px-2">العمارة</th>
                            <th className="py-2 px-2">المحصَّل / المتوقع (جنيه)</th>
                            <th className="py-2 px-2">نسبة التحصيل</th>
                            <th className="py-2 px-2">تمثيل بصري</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const threshold = parseFloat(buildingAmountFilterPct);
                            const rows =
                              !isNaN(threshold)
                                ? buildingsAmountRanking.all.filter(
                                    (b) => (b.paid_percentage ?? 0) <= threshold
                                  )
                                : buildingsAmountRanking.all;

                            return rows.map((b, idx) => {
                              const label = b.building || "عمارة غير محددة";
                              const pct = b.paid_percentage ?? 0;
                              const widthPct = Math.min(100, Math.max(0, pct));

                              return (
                                <tr key={label} className="border-b last:border-0">
                                  <td className="py-1.5 px-2">{idx + 1}</td>
                                  <td className="py-1.5 px-2">{label}</td>
                                  <td className="py-1.5 px-2">
                                    {b.paid_amount.toFixed(0)}/
                                    {b.expected_amount.toFixed(0)} جنيه
                                  </td>
                                  <td className="py-1.5 px-2 font-semibold">
                                    {pct.toFixed(1)}%
                                  </td>
                                  <td className="py-1.5 px-2">
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-500"
                                        style={{ width: `${widthPct}%` }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

            </div>

            {/* NEW: ترتيب العمارات حسب نسبة التحصيل بالمبالغ (جنيه) */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">
                ترتيب العمارات حسب نسبة التحصيل بالمبالغ (PAID)
              </h3>
              <p className="text-xs text-slate-600">
                يتم حساب النسبة لكل عمارة كالتالي:
                إجمالي مبالغ الفواتير المسددة ÷ (عدد الشقق × ٢٠٠ جنيه) × ١٠٠.
              </p>

              {buildingAmountStatsLoading && (
                <p className="text-sm text-slate-600">
                  جارٍ تحميل بيانات العمارات (مبالغ)...
                </p>
              )}

              {buildingAmountStatsError && (
                <p className="text-sm text-red-600">{buildingAmountStatsError}</p>
              )}

              {!buildingAmountStatsLoading &&
                !buildingAmountStatsError &&
                buildingAmountStats.length === 0 && (
                  <p className="text-sm text-slate-600">
                    لا توجد بيانات كافية لعرض ترتيب العمارات بالمبالغ في الفترة المحددة.
                  </p>
                )}

              {!buildingAmountStatsLoading &&
                !buildingAmountStatsError &&
                buildingAmountStats.length > 0 && (
                  <div className="mt-3 max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs sm:text-sm text-right border-collapse">
                      <thead className="bg-slate-50">
                        <tr className="border-b">
                          <th className="py-2 px-2">#</th>
                          <th className="py-2 px-2">العمارة</th>
                          <th className="py-2 px-2">المحصَّل / المتوقع (جنيه)</th>
                          <th className="py-2 px-2">نسبة التحصيل</th>
                          <th className="py-2 px-2">تمثيل بصري</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buildingsAmountRanking.all.map((b, idx) => {
                          const label = b.building || "عمارة غير محددة";
                          const pct = b.paid_percentage ?? 0;
                          const widthPct = Math.min(100, Math.max(0, pct));

                          return (
                            <tr key={label} className="border-b last:border-0">
                              <td className="py-1.5 px-2">{idx + 1}</td>
                              <td className="py-1.5 px-2">{label}</td>
                              <td className="py-1.5 px-2">
                                {b.paid_amount.toFixed(0)}/{b.expected_amount.toFixed(0)} جنيه
                              </td>
                              <td className="py-1.5 px-2 font-semibold">
                                {pct.toFixed(1)}%
                              </td>
                              <td className="py-1.5 px-2">
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${widthPct}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

            </div>

            {/* NEW:Building Details */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">
                تفاصيل شقق عمارة معينة (الشهر الحالي)
              </h3>

              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <div className="text-xs text-slate-600 mb-1">رقم العمارة</div>
                  <input
                    className="border rounded-lg px-3 py-2 text-right w-40"
                    placeholder="مثال: 12"
                    value={unitBuilding}
                    onChange={(e) => setUnitBuilding(e.target.value)}
                  />
                </div>

                <button
                  onClick={loadBuildingUnits}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm"
                  disabled={unitLoading}
                >
                  {unitLoading ? "تحميل..." : "عرض الشقق"}
                </button>

                <div className="flex flex-wrap gap-2">
                  <input
                    className="border rounded-lg px-2 py-2 text-right w-52"
                    placeholder="بحث بالاسم / الدور / الشقة"
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                  />

                  <select
                    className="border rounded-lg px-2 py-2 text-right"
                    value={unitPaidFilter}
                    onChange={(e) => setUnitPaidFilter(e.target.value)}
                  >
                    <option value="">كل الحالات</option>
                    <option value="PAID">مدفوع</option>
                    <option value="UNPAID">غير مدفوع</option>
                  </select>

                  <select
                    className="border rounded-lg px-2 py-2 text-right"
                    value={unitMethodFilter}
                    onChange={(e) => setUnitMethodFilter(e.target.value)}
                  >
                    <option value="">كل الطرق</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="CASH">CASH</option>
                  </select>
                </div>
              </div>

              {unitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {unitError}
                </div>
              )}

              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-slate-600">
                      <th className="py-2">الاسم</th>
                      <th className="py-2">الدور</th>
                      <th className="py-2">الشقة</th>
                      <th className="py-2">الحالة</th>
                      <th className="py-2">المبلغ المدفوع</th>
                      <th className="py-2">طريقة الدفع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnitRows.map((r) => (
                      <tr key={r.user_id} className="border-b last:border-0">
                        <td className="py-2">{r.full_name}</td>
                        <td className="py-2">{r.floor ?? "-"}</td>
                        <td className="py-2">{r.apartment ?? "-"}</td>
                        <td className="py-2">
                          {r.paid_current_month ? (
                            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px]">
                              مدفوع
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-[11px]">
                              غير مدفوع
                            </span>
                          )}
                        </td>
                        <td className="py-2">{(r.paid_amount ?? 0).toFixed(2)}</td>
                        <td className="py-2">{r.payment_method ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
