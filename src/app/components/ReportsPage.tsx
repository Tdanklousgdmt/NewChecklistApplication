import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronRight, Menu, Download, Filter, SlidersHorizontal,
  BarChart3, Users, TrendingUp, CheckCircle2, XCircle, AlertCircle,
  Clock, Award, FileSpreadsheet, FileDown, ChevronDown, X,
  RefreshCw, Loader2, AlertTriangle, Calendar, Search,
  ArrowUpRight, ArrowDownRight, Minus, Info, FileCheck2,
  LayoutGrid, List, Activity,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
  AreaChart, Area,
} from "recharts";
import { toast } from "sonner";
import { checklistService } from "../services/checklistService";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─────────────────────── Types ─────────────────────── */

interface Checklist {
  id: string;
  version: number;
  updatedAt: number;
  data: { title: string; category?: string; status?: string; canvasFields?: any[]; [k: string]: any };
}

interface Submission {
  id: string;
  checklistId: string;
  submittedByEmail: string;
  submittedAt: number;
  totalScore: number;
  status: "submitted" | "validated" | "rejected" | "draft";
  [k: string]: any;
}

/* ─────────────────────── Helpers ─────────────────────── */

const fmtDate  = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtShort = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const pct      = (n: number, d: number) => d === 0 ? 0 : Math.round((n / d) * 100);
const avg      = (arr: number[]) => arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekKey(ts: number) {
  const d = new Date(ts);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return fmtShort(start.getTime());
}

const CATEGORY_COLORS: Record<string, string> = {
  Safety:      "#2abaad",
  Quality:     "#6366f1",
  Maintenance: "#f59e0b",
  Compliance:  "#10b981",
  HR:          "#ec4899",
  Operations:  "#f97316",
  Other:       "#94a3b8",
};

const STATUS_CONFIG = {
  validated: { label: "Approved",  color: "#2abaad", bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200"  },
  submitted: { label: "Pending",   color: "#f59e0b", bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  rejected:  { label: "Rejected",  color: "#ef4444", bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200"   },
  draft:     { label: "Draft",     color: "#94a3b8", bg: "bg-slate-100", text: "text-slate-600",  border: "border-slate-200" },
};

/* ─────────────────────── Export helpers ─────────────────────── */

function exportExcel(
  subs: Submission[],
  checklists: Checklist[],
  checklistStats: any[],
  userStats: any[],
  dateRange: { from: string; to: string },
  categoryFilter: string,
) {
  const wb = XLSX.utils.book_new();
  const title = "eCheck — Plant Reports";
  const now   = new Date().toLocaleString();

  // Sheet 1: Summary
  const summaryData = [
    ["eCheck — Plant Reports"],
    [`Generated: ${now}`],
    [`Date range: ${dateRange.from || "All"} – ${dateRange.to || "All"}`],
    [`Category filter: ${categoryFilter}`],
    [],
    ["Metric", "Value"],
    ["Total Submissions",    subs.length],
    ["Approved",             subs.filter(s => s.status === "validated").length],
    ["Pending Validation",   subs.filter(s => s.status === "submitted").length],
    ["Rejected",             subs.filter(s => s.status === "rejected").length],
    ["Compliance Rate",      `${pct(subs.filter(s => s.status === "validated").length, subs.length)}%`],
    ["Active Checklists",    checklists.filter(c => c.data.status === "active").length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 24 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // Sheet 2: Checklist Performance
  const clRows = checklistStats.map(c => ({
    "Checklist":         c.title,
    "Category":          c.category ?? "—",
    "Status":            c.status === "active" ? "Published" : "Draft",
    "Total Submissions": c.totalSubs,
    "Avg Score":         c.avgScore > 0 ? `${c.avgScore}` : "—",
    "Compliance Rate":   `${c.complianceRate}%`,
    "Approved":          c.approved,
    "Pending":           c.pending,
    "Rejected":          c.rejected,
    "Last Submission":   c.lastSub ? fmtDate(c.lastSub) : "—",
  }));
  if (clRows.length) {
    const wsCl = XLSX.utils.json_to_sheet(clRows);
    wsCl["!cols"] = Object.keys(clRows[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, wsCl, "By Checklist");
  }

  // Sheet 3: User Performance
  const userRows = userStats.map(u => ({
    "User":              u.email,
    "Total Submissions": u.totalSubs,
    "Avg Score":         u.avgScore > 0 ? `${u.avgScore}` : "—",
    "Compliance Rate":   `${u.complianceRate}%`,
    "Approved":          u.approved,
    "Pending":           u.pending,
    "Rejected":          u.rejected,
    "Last Submission":   u.lastSub ? fmtDate(u.lastSub) : "—",
  }));
  if (userRows.length) {
    const wsUsers = XLSX.utils.json_to_sheet(userRows);
    wsUsers["!cols"] = Object.keys(userRows[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, wsUsers, "By User");
  }

  // Sheet 4: Raw Submissions
  const rawRows = subs.map(s => {
    const cl = checklists.find(c => c.id === s.checklistId);
    return {
      "Submission ID": s.id,
      "Checklist":     cl?.data.title ?? s.checklistId,
      "Category":      cl?.data.category ?? "—",
      "User":          s.submittedByEmail,
      "Date":          fmtDate(s.submittedAt),
      "Score":         s.totalScore,
      "Status":        s.status,
    };
  });
  if (rawRows.length) {
    const wsRaw = XLSX.utils.json_to_sheet(rawRows);
    wsRaw["!cols"] = Object.keys(rawRows[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, wsRaw, "Raw Submissions");
  }

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url; a.download = `eCheck_Plant_Report_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(
  subs: Submission[],
  checklists: Checklist[],
  checklistStats: any[],
  userStats: any[],
  dateRange: { from: string; to: string },
  categoryFilter: string,
) {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();

  // Cover
  doc.setFontSize(20); doc.setTextColor(42, 186, 173);
  doc.text("eCheck — Plant Reports", 14, 20);
  doc.setFontSize(10); doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${now}`, 14, 28);
  doc.text(`Date range: ${dateRange.from || "All time"} – ${dateRange.to || "present"}`, 14, 34);
  doc.text(`Category: ${categoryFilter}`, 14, 40);

  // KPI table
  doc.setFontSize(13); doc.setTextColor(30, 30, 30);
  doc.text("Key Metrics", 14, 52);
  autoTable(doc, {
    startY: 56,
    head: [["Metric", "Value"]],
    body: [
      ["Total Submissions",   subs.length.toString()],
      ["Compliance Rate",     `${pct(subs.filter(s => s.status === "validated").length, subs.length)}%`],
      ["Pending Validation",  subs.filter(s => s.status === "submitted").length.toString()],
      ["Rejected",            subs.filter(s => s.status === "rejected").length.toString()],
      ["Active Checklists",   checklists.filter(c => c.data.status === "active").length.toString()],
    ],
    theme: "grid",
    headStyles: { fillColor: [42, 186, 173], textColor: 255 },
    columnStyles: { 0: { fontStyle: "bold" } },
    styles: { fontSize: 10 },
  });

  // Checklist table
  let y = (doc as any).lastAutoTable?.finalY + 12 ?? 110;
  doc.setFontSize(13); doc.setTextColor(30, 30, 30);
  doc.text("Checklist Performance", 14, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Checklist", "Category", "Submissions", "Compliance%", "Approved", "Pending", "Rejected"]],
    body: checklistStats.map(c => [
      c.title.substring(0, 30), c.category ?? "—", c.totalSubs.toString(),
      `${c.complianceRate}%`, c.approved.toString(), c.pending.toString(), c.rejected.toString()
    ]),
    theme: "striped",
    headStyles: { fillColor: [42, 186, 173], textColor: 255 },
    styles: { fontSize: 8 },
  });

  // User table
  if (doc.internal.getCurrentPageInfo().pageNumber < 3) {
    y = (doc as any).lastAutoTable?.finalY + 12 ?? 200;
    if (y > 250) { doc.addPage(); y = 14; }
    doc.setFontSize(13); doc.text("User Performance", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["User", "Submissions", "Avg Score", "Compliance%", "Last Active"]],
      body: userStats.map(u => [
        u.email.substring(0, 30), u.totalSubs.toString(),
        u.avgScore > 0 ? `${u.avgScore}` : "—",
        `${u.complianceRate}%`,
        u.lastSub ? fmtDate(u.lastSub) : "—"
      ]),
      theme: "striped",
      headStyles: { fillColor: [42, 186, 173], textColor: 255 },
      styles: { fontSize: 8 },
    });
  }

  doc.save(`eCheck_Plant_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ─────────────────────── Main Component ─────────────────────── */

interface ReportsPageProps {
  onOpenNav?: () => void;
  onViewChecklist?: (id: string) => void;
}

type ReportTab = "overview" | "checklists" | "users" | "trends";

export function ReportsPage({ onOpenNav, onViewChecklist }: ReportsPageProps) {
  const [checklists, setChecklists]   = useState<Checklist[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [activeTab, setActiveTab]     = useState<ReportTab>("overview");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom]           = useState(thirtyDaysAgo);
  const [dateTo, setDateTo]               = useState(today);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [checklistFilter, setChecklistFilter] = useState("all");
  const [userSearch, setUserSearch]       = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [activeRes, draftRes, subsRes] = await Promise.allSettled([
        checklistService.listChecklists("active"),
        checklistService.listChecklists("draft"),
        checklistService.getSubmissions(),
      ]);
      const cls  = [...(activeRes.status  === "fulfilled" ? activeRes.value  : []),
                    ...(draftRes.status   === "fulfilled" ? draftRes.value   : [])];
      const subs = subsRes.status === "fulfilled" ? subsRes.value : [];
      setChecklists(cls as Checklist[]);
      setSubmissions(subs as Submission[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ─── Filtered submissions ─── */
  const filteredSubs = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toTs   = dateTo   ? new Date(dateTo + "T23:59:59").getTime() : Infinity;
    return submissions.filter(s => {
      if (s.submittedAt < fromTs || s.submittedAt > toTs) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (checklistFilter !== "all" && s.checklistId !== checklistFilter) return false;
      if (categoryFilter !== "All") {
        const cl = checklists.find(c => c.id === s.checklistId);
        if (cl?.data.category !== categoryFilter) return false;
      }
      if (userSearch && !s.submittedByEmail.toLowerCase().includes(userSearch.toLowerCase())) return false;
      return true;
    });
  }, [submissions, dateFrom, dateTo, statusFilter, checklistFilter, categoryFilter, userSearch, checklists]);

  /* ─── Computed stats ─── */
  const { checklistStats, userStats, categories } = useMemo(() => {
    const clMap = new Map(checklists.map(c => [c.id, c]));

    // Checklist stats
    const byChecklist: Record<string, Submission[]> = {};
    filteredSubs.forEach(s => { (byChecklist[s.checklistId] ??= []).push(s); });

    const checklistStats = checklists.map(cl => {
      const clSubs = byChecklist[cl.id] ?? [];
      const approved = clSubs.filter(s => s.status === "validated").length;
      const pending  = clSubs.filter(s => s.status === "submitted").length;
      const rejected = clSubs.filter(s => s.status === "rejected").length;
      const scores   = clSubs.map(s => s.totalScore).filter(n => n > 0);
      return {
        id: cl.id, title: cl.data.title, category: cl.data.category ?? "Other",
        clStatus: cl.data.status ?? "active",
        totalSubs: clSubs.length, approved, pending, rejected,
        avgScore: avg(scores),
        complianceRate: pct(approved, clSubs.length),
        lastSub: clSubs.length ? Math.max(...clSubs.map(s => s.submittedAt)) : 0,
      };
    }).sort((a, b) => b.totalSubs - a.totalSubs);

    // User stats
    const byUser: Record<string, Submission[]> = {};
    filteredSubs.forEach(s => { (byUser[s.submittedByEmail] ??= []).push(s); });
    const userStats = Object.entries(byUser).map(([email, uSubs]) => {
      const approved = uSubs.filter(s => s.status === "validated").length;
      const pending  = uSubs.filter(s => s.status === "submitted").length;
      const rejected = uSubs.filter(s => s.status === "rejected").length;
      const scores   = uSubs.map(s => s.totalScore).filter(n => n > 0);
      return {
        email, totalSubs: uSubs.length, approved, pending, rejected,
        avgScore: avg(scores),
        complianceRate: pct(approved, uSubs.length),
        lastSub: Math.max(...uSubs.map(s => s.submittedAt)),
      };
    }).sort((a, b) => b.totalSubs - a.totalSubs);

    // Unique categories
    const categories = ["All", ...Array.from(new Set(checklists.map(c => c.data.category ?? "Other")))];

    return { checklistStats, userStats, categories, clMap };
  }, [checklists, filteredSubs]);

  /* ─── Chart data ─── */
  const { trendData, categoryData, statusBreakdown } = useMemo(() => {
    // Daily trend (last 30 days in filtered range)
    const dailyMap: Record<string, { date: string; count: number; approved: number }> = {};
    filteredSubs.forEach(s => {
      const k = dayKey(s.submittedAt);
      if (!dailyMap[k]) dailyMap[k] = { date: fmtShort(s.submittedAt), count: 0, approved: 0 };
      dailyMap[k].count++;
      if (s.status === "validated") dailyMap[k].approved++;
    });
    const trendData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, compliance: pct(v.approved, v.count) }));

    // Category distribution
    const catMap: Record<string, number> = {};
    filteredSubs.forEach(s => {
      const cl  = checklists.find(c => c.id === s.checklistId);
      const cat = cl?.data.category ?? "Other";
      catMap[cat] = (catMap[cat] ?? 0) + 1;
    });
    const categoryData = Object.entries(catMap)
      .map(([cat, count]) => ({ category: cat, count, color: CATEGORY_COLORS[cat] ?? "#94a3b8" }))
      .sort((a, b) => b.count - a.count);

    // Status breakdown
    const statusBreakdown = [
      { name: "Approved", value: filteredSubs.filter(s => s.status === "validated").length, color: "#2abaad" },
      { name: "Pending",  value: filteredSubs.filter(s => s.status === "submitted").length, color: "#f59e0b" },
      { name: "Rejected", value: filteredSubs.filter(s => s.status === "rejected").length, color: "#ef4444" },
    ];

    return { trendData, categoryData, statusBreakdown };
  }, [filteredSubs, checklists]);

  /* ─── KPIs ─── */
  const kpis = useMemo(() => {
    const approved  = filteredSubs.filter(s => s.status === "validated").length;
    const compliance = pct(approved, filteredSubs.length);
    const prevSubs  = submissions.filter(s => {
      const fromTs = dateFrom ? new Date(dateFrom).getTime() - (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) : 0;
      const toTs   = dateFrom ? new Date(dateFrom).getTime() : Infinity;
      return s.submittedAt >= fromTs && s.submittedAt < toTs;
    });
    const prevCompliance = pct(prevSubs.filter(s => s.status === "validated").length, prevSubs.length);
    return {
      totalSubs:   filteredSubs.length,
      compliance,
      complianceTrend: compliance - prevCompliance,
      approved,
      pending:     filteredSubs.filter(s => s.status === "submitted").length,
      rejected:    filteredSubs.filter(s => s.status === "rejected").length,
      activeChecklists: checklists.filter(c => c.data.status === "active").length,
    };
  }, [filteredSubs, submissions, checklists, dateFrom, dateTo]);

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundSize: "12px", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", paddingRight: "2rem",
  };
  const selectCls = "px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] appearance-none cursor-pointer transition-all";

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-[#2abaad] animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading plant reports…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={onOpenNav} aria-label="Open menu"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[#2abaad] tracking-wide uppercase text-xs font-medium shrink-0">eCheck</span>
          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
          <span className="text-gray-700 tracking-wide uppercase text-xs truncate">Plant Reports</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={load}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-500" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="relative">
            <button type="button" onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#2abaad] text-white rounded-xl text-xs font-medium hover:bg-[#24a699] transition-colors shadow-sm shadow-teal-100">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-20 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Download as</p>
                  </div>
                  <button type="button" onClick={() => {
                    setExportMenuOpen(false);
                    exportPDF(filteredSubs, checklists, checklistStats, userStats, { from: dateFrom, to: dateTo }, categoryFilter);
                    toast.success("PDF report downloading…");
                  }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <FileDown className="w-4 h-4 text-red-500" />Export as PDF
                  </button>
                  <button type="button" onClick={() => {
                    setExportMenuOpen(false);
                    exportExcel(filteredSubs, checklists, checklistStats, userStats, { from: dateFrom, to: dateTo }, categoryFilter);
                    toast.success("Excel file downloading…");
                  }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* ── Page title ── */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-[#2abaad]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Plant Reports</h1>
            </div>
            <p className="text-sm text-gray-500 pl-12">Cross-checklist analytics, compliance tracking and user performance.</p>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button type="button" onClick={load} className="text-xs font-medium text-red-600 hover:underline">Retry</button>
            </div>
          )}

          {/* ── Filters ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 sm:px-5 py-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date range */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad]" />
                <span className="text-gray-400 text-sm shrink-0">→</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad]" />
              </div>

              {/* Mobile toggle */}
              <button type="button" onClick={() => setShowFilters(!showFilters)}
                className={`sm:hidden flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs transition-colors ${showFilters ? "bg-teal-50 border-teal-200 text-[#2abaad]" : "border-gray-200 text-gray-600"}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />Filters
              </button>
            </div>

            <div className={`${showFilters ? "flex" : "hidden"} sm:flex flex-wrap items-center gap-2 mt-3`}>
              <div className="flex items-center gap-1.5 text-gray-500 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Filter:</span>
              </div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className={selectCls} style={selectStyle}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className={selectCls} style={selectStyle}>
                <option value="all">All Statuses</option>
                <option value="validated">Approved</option>
                <option value="submitted">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <select value={checklistFilter} onChange={e => setChecklistFilter(e.target.value)}
                className={selectCls + " max-w-[200px]"} style={selectStyle}>
                <option value="all">All Checklists</option>
                {checklists.map(c => <option key={c.id} value={c.id}>{c.data.title}</option>)}
              </select>
              <div className="relative ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Search user…" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad]" />
                {userSearch && <button type="button" onClick={() => setUserSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
            </div>
          </div>

          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard value={filteredSubs.length.toString()} label="Submissions"
              icon={<Activity className="w-4 h-4 text-[#2abaad]" />} bg="bg-teal-50" />
            <KpiCard value={`${kpis.compliance}%`} label="Compliance"
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} bg="bg-emerald-50"
              trend={kpis.complianceTrend} />
            <KpiCard value={kpis.approved.toString()} label="Approved"
              icon={<CheckCircle2 className="w-4 h-4 text-teal-600" />} bg="bg-teal-50" />
            <KpiCard value={kpis.pending.toString()} label="Pending"
              icon={<Clock className="w-4 h-4 text-amber-600" />} bg="bg-amber-50" alert={kpis.pending > 0} />
            <KpiCard value={kpis.rejected.toString()} label="Rejected"
              icon={<XCircle className="w-4 h-4 text-red-500" />} bg="bg-red-50" alert={kpis.rejected > 0} />
            <KpiCard value={kpis.activeChecklists.toString()} label="Active Lists"
              icon={<FileCheck2 className="w-4 h-4 text-indigo-600" />} bg="bg-indigo-50" />
          </div>

          {/* ── Tab bar ── */}
          <div className="flex items-center gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {([
              { id: "overview",   label: "Overview",        icon: <LayoutGrid className="w-4 h-4" /> },
              { id: "checklists", label: "By Checklist",    icon: <List className="w-4 h-4" /> },
              { id: "users",      label: "By User",         icon: <Users className="w-4 h-4" /> },
              { id: "trends",     label: "Trends",          icon: <Activity className="w-4 h-4" /> },
            ] as { id: ReportTab; label: string; icon: React.ReactNode }[]).map(tab => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "bg-teal-50 text-[#2abaad]" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* ══════════ OVERVIEW ══════════ */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Submission trend area chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Submission Activity</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Submissions per day in selected period</p>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Info className="w-3.5 h-3.5" />{trendData.length} days</span>
                  </div>
                  {trendData.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#2abaad" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#2abaad" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
                          formatter={(v: number, n: string) => [v, n === "count" ? "Submissions" : "Approved"]} />
                        <Area type="monotone" dataKey="count" stroke="#2abaad" strokeWidth={2} fill="url(#tealGrad)" dot={false} />
                        <Area type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Status donut */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-800">Status Breakdown</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Filtered submissions</p>
                  </div>
                  {filteredSubs.length === 0 ? <EmptyChart height={130} /> : (
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">
                          {statusBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex flex-col gap-1.5 mt-1">
                    {statusBreakdown.map(s => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-gray-600">{s.name}</span>
                        </div>
                        <span className="font-semibold text-gray-800">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category breakdown bar chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">Submissions by Category</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Distribution across checklist categories</p>
                </div>
                {categoryData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
                        formatter={(v: number) => [v, "Submissions"]} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Top/Bottom performers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <LeaderCard title="Top Performing Checklists" items={checklistStats.filter(c => c.totalSubs > 0).sort((a, b) => b.complianceRate - a.complianceRate).slice(0, 5)}
                  onView={onViewChecklist} />
                <LeaderCard title="Needs Attention" items={checklistStats.filter(c => c.totalSubs > 0 && c.complianceRate < 80).sort((a, b) => a.complianceRate - b.complianceRate).slice(0, 5)}
                  danger onView={onViewChecklist} />
              </div>
            </div>
          )}

          {/* ══════════ BY CHECKLIST ══════════ */}
          {activeTab === "checklists" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_100px_90px_100px_90px_80px_80px_80px] gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/60">
                {["Checklist", "Category", "Submissions", "Compliance", "Avg Score", "Approved", "Pending", "Rejected"].map(h => (
                  <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>
              {checklistStats.length === 0 ? (
                <div className="py-14 text-center text-gray-400">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No checklists match current filters.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {checklistStats.map(c => (
                    <ChecklistStatRow key={c.id} stat={c} onView={() => onViewChecklist?.(c.id)} />
                  ))}
                </div>
              )}
              <div className="px-4 sm:px-6 py-3 border-t border-gray-50 bg-gray-50/40">
                <p className="text-xs text-gray-400">
                  {checklistStats.length} checklists · {filteredSubs.length} submissions in period
                </p>
              </div>
            </div>
          )}

          {/* ══════════ BY USER ══════════ */}
          {activeTab === "users" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_110px_90px_110px_80px_80px_80px] gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/60">
                {["User", "Submissions", "Avg Score", "Compliance", "Approved", "Pending", "Rejected"].map(h => (
                  <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>
              {userStats.length === 0 ? (
                <div className="py-14 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No users match current filters.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {userStats.map(u => <UserStatRow key={u.email} stat={u} />)}
                </div>
              )}
              <div className="px-4 sm:px-6 py-3 border-t border-gray-50 bg-gray-50/40">
                <p className="text-xs text-gray-400">{userStats.length} users · {filteredSubs.length} submissions</p>
              </div>
            </div>
          )}

          {/* ══════════ TRENDS ══════════ */}
          {activeTab === "trends" && (
            <div className="space-y-5">
              {/* Compliance rate over time */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Compliance Rate Over Time</h3>
                    <p className="text-xs text-gray-400 mt-0.5">% of approved submissions per day</p>
                  </div>
                </div>
                {trendData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
                        formatter={(v: number) => [`${v}%`, "Compliance"]} />
                      <Line type="monotone" dataKey="compliance" stroke="#2abaad" strokeWidth={2.5}
                        dot={{ fill: "#2abaad", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                      <Line type="monotone" dataKey={() => 80} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth={1.5} dot={false} legendType="none" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                <p className="text-[10px] text-gray-400 mt-1 text-right">— dashed line = 80% target</p>
              </div>

              {/* Per-checklist compliance heatmap-style bar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">Compliance by Checklist</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Ordered by compliance rate</p>
                </div>
                {checklistStats.filter(c => c.totalSubs > 0).length === 0 ? <EmptyChart /> : (
                  <div className="space-y-2.5">
                    {checklistStats.filter(c => c.totalSubs > 0).slice(0, 10).map(c => (
                      <div key={c.id}>
                        <div className="flex items-center justify-between mb-1">
                          <button type="button" onClick={() => onViewChecklist?.(c.id)}
                            className="text-xs font-medium text-gray-700 hover:text-[#2abaad] transition-colors truncate max-w-[200px] text-left">
                            {c.title}
                          </button>
                          <span className={`text-xs font-bold ml-2 shrink-0 ${c.complianceRate >= 80 ? "text-teal-600" : c.complianceRate >= 60 ? "text-amber-600" : "text-red-500"}`}>
                            {c.complianceRate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all"
                            style={{ width: `${c.complianceRate}%`, backgroundColor: c.complianceRate >= 80 ? "#2abaad" : c.complianceRate >= 60 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume bar chart per checklist */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">Submission Volume by Checklist</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Top 8 most-submitted in selected period</p>
                </div>
                {checklistStats.filter(c => c.totalSubs > 0).length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={checklistStats.filter(c => c.totalSubs > 0).slice(0, 8).map(c => ({ name: c.title.slice(0, 18), approved: c.approved, pending: c.pending, rejected: c.rejected }))}
                      margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="approved" name="Approved" stackId="a" fill="#2abaad" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pending"  name="Pending"  stackId="a" fill="#f59e0b" />
                      <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ─────────────── Sub-components ─────────────── */

function KpiCard({ value, label, icon, bg, trend, alert }: {
  value: string; label: string; icon: React.ReactNode; bg: string; trend?: number; alert?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border ${alert && parseInt(value) > 0 ? "border-amber-200" : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
          {trend !== undefined && trend !== 0 && (
            <div className={`flex items-center gap-0.5 text-[10px] font-medium mt-0.5 ${trend > 0 ? "text-teal-600" : "text-red-500"}`}>
              {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}pp vs prev.
            </div>
          )}
          {trend === 0 && <div className="flex items-center gap-0.5 text-[10px] font-medium mt-0.5 text-gray-400"><Minus className="w-3 h-3" />No change</div>}
        </div>
        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center shrink-0`}>{icon}</div>
      </div>
    </div>
  );
}

function ChecklistStatRow({ stat, onView }: { stat: any; onView: () => void }) {
  const compColor = stat.complianceRate >= 80 ? "text-teal-600" : stat.complianceRate >= 60 ? "text-amber-600" : "text-red-500";
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_100px_90px_100px_90px_80px_80px_80px] gap-3 items-center px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
        <button type="button" onClick={onView} className="min-w-0 text-left group">
          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-[#2abaad] transition-colors">{stat.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{stat.clStatus === "active" ? "Published" : "Draft"}</p>
        </button>
        <div><span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">{stat.category}</span></div>
        <div><span className="text-sm font-medium text-gray-700">{stat.totalSubs}</span></div>
        <div>
          <span className={`text-sm font-bold ${compColor}`}>{stat.complianceRate}%</span>
          <div className="w-16 bg-gray-100 rounded-full h-1.5 mt-1">
            <div className="h-1.5 rounded-full" style={{ width: `${stat.complianceRate}%`, backgroundColor: stat.complianceRate >= 80 ? "#2abaad" : stat.complianceRate >= 60 ? "#f59e0b" : "#ef4444" }} />
          </div>
        </div>
        <div><span className="text-sm text-gray-600">{stat.avgScore > 0 ? stat.avgScore : "—"}</span></div>
        <div><span className="text-sm text-teal-600 font-medium">{stat.approved}</span></div>
        <div><span className="text-sm text-amber-600 font-medium">{stat.pending}</span></div>
        <div><span className="text-sm text-red-500 font-medium">{stat.rejected}</span></div>
      </div>
      {/* Mobile */}
      <div className="sm:hidden px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
        <button type="button" onClick={onView} className="w-full text-left">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-gray-800 truncate">{stat.title}</p>
            <span className={`text-sm font-bold ${compColor} ml-2 shrink-0`}>{stat.complianceRate}%</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="bg-gray-100 px-1.5 py-0.5 rounded">{stat.category}</span>
            <span>{stat.totalSubs} subs</span>
            <span className="text-teal-600">{stat.approved}✓</span>
            {stat.pending > 0 && <span className="text-amber-600">{stat.pending} pending</span>}
          </div>
        </button>
      </div>
    </>
  );
}

function UserStatRow({ stat }: { stat: any }) {
  const compColor = stat.complianceRate >= 80 ? "text-teal-600" : stat.complianceRate >= 60 ? "text-amber-600" : "text-red-500";
  const initial   = (stat.email[0] ?? "?").toUpperCase();
  const colors    = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-teal-100 text-teal-700", "bg-orange-100 text-orange-700", "bg-emerald-100 text-emerald-700"];
  const color     = colors[stat.email.charCodeAt(0) % colors.length];
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_110px_90px_110px_80px_80px_80px] gap-3 items-center px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>{initial}</div>
          <p className="text-sm font-medium text-gray-800 truncate">{stat.email}</p>
        </div>
        <div><span className="text-sm font-medium text-gray-700">{stat.totalSubs}</span></div>
        <div><span className="text-sm text-gray-600">{stat.avgScore > 0 ? stat.avgScore : "—"}</span></div>
        <div>
          <span className={`text-sm font-bold ${compColor}`}>{stat.complianceRate}%</span>
          <div className="w-16 bg-gray-100 rounded-full h-1.5 mt-1">
            <div className="h-1.5 rounded-full" style={{ width: `${stat.complianceRate}%`, backgroundColor: stat.complianceRate >= 80 ? "#2abaad" : stat.complianceRate >= 60 ? "#f59e0b" : "#ef4444" }} />
          </div>
        </div>
        <div><span className="text-sm text-teal-600 font-medium">{stat.approved}</span></div>
        <div><span className="text-sm text-amber-600 font-medium">{stat.pending}</span></div>
        <div><span className="text-sm text-red-500 font-medium">{stat.rejected}</span></div>
      </div>
      {/* Mobile */}
      <div className="sm:hidden px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>{initial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 truncate">{stat.email}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span>{stat.totalSubs} subs</span>
              <span className={`font-semibold ${compColor}`}>{stat.complianceRate}% compliance</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function LeaderCard({ title, items, danger, onView }: { title: string; items: any[]; danger?: boolean; onView?: (id: string) => void }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No data in selected period.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                danger ? "bg-red-50 text-red-500" : "bg-teal-50 text-[#2abaad]"
              }`}>{i + 1}</span>
              <button type="button" onClick={() => onView?.(c.id)}
                className="text-xs font-medium text-gray-700 hover:text-[#2abaad] transition-colors truncate flex-1 text-left">
                {c.title}
              </button>
              <span className={`text-xs font-bold shrink-0 ${c.complianceRate >= 80 ? "text-teal-600" : c.complianceRate >= 60 ? "text-amber-600" : "text-red-500"}`}>
                {c.complianceRate}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyChart({ height = 160 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center bg-gray-50 rounded-xl" style={{ height }}>
      <div className="text-center">
        <BarChart3 className="w-6 h-6 text-gray-300 mx-auto mb-1" />
        <p className="text-xs text-gray-400">No data in selected period</p>
      </div>
    </div>
  );
}
