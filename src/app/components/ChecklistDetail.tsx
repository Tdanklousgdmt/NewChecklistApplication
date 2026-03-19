import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, ArrowLeft, CheckCircle2, Clock, FileEdit,
  Users, TrendingUp, Award,   ChevronDown,
  CalendarDays, UserCircle, CheckCheck, AlertCircle, XCircle,
  Eye, Tag, BarChart3, History, Info, FileSpreadsheet, FileDown,
  Download, X, CheckSquare, MinusSquare, MessageSquare, Camera,
  Type, Loader2, AlertTriangle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { toast } from "sonner";
import { checklistService } from "../services/checklistService";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─────────────── Types ─────────────── */

type SubmissionStatus = "submitted" | "validated" | "rejected" | "draft";

interface Submission {
  id: string;
  checklistId: string;
  submittedByEmail: string;
  submittedAt: number;
  totalScore: number;
  status: SubmissionStatus;
  answers: Array<{ fieldId: string; value: any; score?: number }>;
  [key: string]: any;
}

interface ChecklistData {
  id: string;
  version: number;
  updatedAt: number;
  data: {
    title: string;
    category?: string;
    status?: string;
    priority?: string;
    location?: string;
    canvasFields?: any[];
    createdAt?: number;
    [key: string]: any;
  };
}

/* ─────────────── Export helpers ─────────────── */

function formatTs(ts: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function pct(score: number, max: number) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

function buildMaxScore(checklist: ChecklistData) {
  const fields = checklist.data.canvasFields ?? [];
  return fields.reduce((acc: number, f: any) => acc + (f.maxScore ?? f.points ?? 0), 0);
}

/** Download a Blob as a file */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export submission history to Excel */
function exportHistoryExcel(submissions: Submission[], checklistTitle: string, maxScore: number) {
  const rows = submissions.map((s) => ({
    "User":         s.submittedByEmail,
    "Date":         formatTs(s.submittedAt),
    "Score":        s.totalScore,
    "Max Score":    maxScore || "—",
    "Score (%)":    maxScore ? `${pct(s.totalScore, maxScore)}%` : "—",
    "Status":       s.status,
    "Time (saved draft first)": s.savedDraftFirst ? "Yes" : "No",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto column widths
  const colWidths = Object.keys(rows[0] ?? {}).map((k) => ({ wch: Math.max(k.length, 14) }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Submissions");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${checklistTitle.replace(/[^a-z0-9]/gi, "_")}_submissions.xlsx`);
}

/** Export overview report (KPIs + submission table) to PDF */
function exportReportsPDF(
  submissions: Submission[],
  checklist: ChecklistData,
  maxScore: number,
  kpis: { avgScore: number; approvalRate: number; avgTimeMins: number; totalSubs: number }
) {
  const doc   = new jsPDF();
  const title = checklist.data.title ?? "Checklist";
  const now   = new Date().toLocaleDateString();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(42, 186, 173);
  doc.text("eCheck — Checklist Report", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 14, 28);

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`Category: ${checklist.data.category ?? "—"}  |  Version: v${checklist.version}  |  Generated: ${now}`, 14, 35);

  // KPI summary
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("Summary", 14, 47);

  autoTable(doc, {
    startY: 51,
    head: [["Metric", "Value"]],
    body: [
      ["Total Submissions", kpis.totalSubs.toString()],
      ["Average Score",     `${kpis.avgScore}%`],
      ["Approval Rate",     `${kpis.approvalRate}%`],
      ["Average Time",      `${kpis.avgTimeMins} min`],
    ],
    theme: "grid",
    headStyles: { fillColor: [42, 186, 173], textColor: 255 },
    columnStyles: { 0: { fontStyle: "bold" } },
    styles: { fontSize: 10 },
  });

  // Submission history
  const finalY = (doc as any).lastAutoTable?.finalY ?? 110;
  doc.setFontSize(11);
  doc.text("Submission History", 14, finalY + 10);

  autoTable(doc, {
    startY: finalY + 14,
    head: [["User", "Date", "Score", "Score %", "Status"]],
    body: submissions.map((s) => [
      s.submittedByEmail,
      formatTs(s.submittedAt),
      `${s.totalScore}${maxScore ? `/${maxScore}` : ""}`,
      maxScore ? `${pct(s.totalScore, maxScore)}%` : "—",
      s.status,
    ]),
    theme: "striped",
    headStyles: { fillColor: [42, 186, 173], textColor: 255 },
    styles: { fontSize: 9 },
  });

  doc.save(`${title.replace(/[^a-z0-9]/gi, "_")}_report.pdf`);
}

/** Export a single submission detail to PDF */
function exportSubmissionPDF(submission: Submission, checklist: ChecklistData, maxScore: number) {
  const doc       = new jsPDF();
  const title     = checklist.data.title ?? "Checklist";
  const fields    = checklist.data.canvasFields ?? [];
  const scorePct  = maxScore ? pct(submission.totalScore, maxScore) : null;

  doc.setFontSize(18);
  doc.setTextColor(42, 186, 173);
  doc.text("eCheck — Submission Detail", 14, 18);

  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 14, 28);

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `User: ${submission.submittedByEmail}  |  Date: ${formatTs(submission.submittedAt)}  |  Status: ${submission.status}`,
    14, 35
  );

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(
    `Overall Score: ${submission.totalScore}${maxScore ? `/${maxScore}` : ""}${scorePct !== null ? ` (${scorePct}%)` : ""}`,
    14, 44
  );

  // Answers table
  const answersBody = (submission.answers ?? []).map((ans: any) => {
    const field = fields.find((f: any) => f.id === ans.fieldId);
    const label = field?.label ?? field?.question ?? ans.fieldId ?? "—";
    const val   = Array.isArray(ans.value) ? ans.value.join(", ") : String(ans.value ?? "—");
    const pts   = ans.score !== undefined ? `${ans.score}${field?.maxScore ? `/${field.maxScore}` : ""}` : "—";
    return [label, val.substring(0, 60), pts];
  });

  autoTable(doc, {
    startY: 50,
    head:   [["Question", "Answer", "Points"]],
    body:   answersBody.length ? answersBody : [["No answers recorded", "", ""]],
    theme:  "striped",
    headStyles: { fillColor: [42, 186, 173], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 }, 2: { cellWidth: 20 } },
  });

  doc.save(`${submission.submittedByEmail.replace(/[^a-z0-9]/gi, "_")}_submission_${submission.id.slice(-6)}.pdf`);
}

/* ─────────────── Chart helpers ─────────────── */

function buildScoreTrend(submissions: Submission[], maxScore: number) {
  return [...submissions]
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .slice(-15)
    .map((s) => ({
      date:  new Date(s.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      score: maxScore ? pct(s.totalScore, maxScore) : s.totalScore,
      user:  s.submittedByEmail.split("@")[0],
    }));
}

function buildSubsPerDay(submissions: Submission[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const now = Date.now();
  submissions.filter((s) => now - s.submittedAt < 7 * 86400000)
    .forEach((s) => counts[new Date(s.submittedAt).getDay()]++);
  const todayIdx = new Date().getDay();
  return days.map((d, i) => ({ day: d, count: counts[i], isToday: i === todayIdx }));
}

function buildStatusBreakdown(submissions: Submission[]) {
  const approved = submissions.filter((s) => s.status === "validated").length;
  const pending  = submissions.filter((s) => s.status === "submitted").length;
  const rejected = submissions.filter((s) => s.status === "rejected").length;
  return [
    { name: "Approved",  value: approved, color: "#2abaad" },
    { name: "Pending",   value: pending,  color: "#f59e0b" },
    { name: "Rejected",  value: rejected, color: "#ef4444" },
  ];
}

/* ─────────────── Main Component ─────────────── */

interface ChecklistDetailProps {
  checklistId: string;
  onBack: () => void;
}

export function ChecklistDetail({ checklistId, onBack }: ChecklistDetailProps) {
  const [checklist, setChecklist]     = useState<ChecklistData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [activeTab, setActiveTab]               = useState<"overview" | "history">("overview");
  const [exportMenuOpen, setExportMenuOpen]     = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingDetail, setLoadingDetail]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cl, subs] = await Promise.all([
        checklistService.getChecklist(checklistId),
        checklistService.getSubmissions(checklistId),
      ]);
      if (!cl) throw new Error("Checklist not found");
      setChecklist(cl as ChecklistData);
      setSubmissions((subs ?? []) as Submission[]);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [checklistId]);

  useEffect(() => { load(); }, [load]);

  const openSubmissionDetail = async (sub: Submission) => {
    // Try to get the full submission (with answers) if not already loaded
    if (!sub.answers || sub.answers.length === 0) {
      setLoadingDetail(true);
      try {
        const full = await checklistService.getSubmission(sub.id);
        setSelectedSubmission(full ?? sub);
      } catch {
        setSelectedSubmission(sub);
      } finally {
        setLoadingDetail(false);
      }
    } else {
      setSelectedSubmission(sub);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#2abaad] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading checklist details…</p>
        </div>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-gray-700 font-medium">{error ?? "Checklist not found"}</p>
          <button type="button" onClick={onBack} className="mt-4 text-sm text-[#2abaad] hover:underline">← Back to Library</button>
        </div>
      </div>
    );
  }

  const maxScore      = buildMaxScore(checklist);
  const scoreTrend    = buildScoreTrend(submissions, maxScore);
  const subsPerDay    = buildSubsPerDay(submissions);
  const statusBreak   = buildStatusBreakdown(submissions);
  const avgScore      = submissions.length ? Math.round(submissions.reduce((a, s) => a + pct(s.totalScore, maxScore || 1), 0) / submissions.length) : 0;
  const approvalRate  = submissions.length ? Math.round(submissions.filter((s) => s.status === "validated").length / submissions.length * 100) : 0;
  const kpis          = { avgScore, approvalRate, avgTimeMins: 0, totalSubs: submissions.length };

  const isPublished = checklist.data.status === "active";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[#2abaad] tracking-wide uppercase text-xs font-medium shrink-0">eCheck</span>
          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
          <button type="button" onClick={onBack}
            className="text-gray-500 tracking-wide uppercase text-xs hover:text-[#2abaad] transition-colors shrink-0">Library</button>
          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
          <span className="text-gray-700 tracking-wide uppercase text-xs truncate">{checklist.data.title}</span>
        </div>
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs tracking-wide hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Library</span>
        </button>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">

          {/* ── Info card ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCheck className="w-6 h-6 text-[#2abaad]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-lg sm:text-xl font-bold text-gray-800">{checklist.data.title}</h1>
                    {isPublished ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                        <CheckCircle2 className="w-3 h-3" />Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <Clock className="w-3 h-3" />Draft
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    {checklist.data.category && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{checklist.data.category}</span>}
                    {checklist.data.canvasFields && <><span>·</span><span className="flex items-center gap-1"><FileEdit className="w-3 h-3" />{checklist.data.canvasFields.length} fields</span></>}
                    {checklist.data.location && <><span>·</span><span className="flex items-center gap-1"><UserCircle className="w-3 h-3" />{checklist.data.location}</span></>}
                    <span>·</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Updated {new Date(checklist.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Version badge */}
              <div className="shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-teal-500" : "bg-slate-400"}`} />
                  <span className="text-sm font-semibold text-gray-700">v{checklist.version}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1.5">
            <TabBtn active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
              <BarChart3 className="w-4 h-4" />Overview &amp; Reports
            </TabBtn>
            <TabBtn active={activeTab === "history"} onClick={() => setActiveTab("history")}>
              <History className="w-4 h-4" />Submission History
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">{submissions.length}</span>
            </TabBtn>
          </div>

          {/* ════════ OVERVIEW ════════ */}
          {activeTab === "overview" && (
            <div className="space-y-5 sm:space-y-6">

              {/* Export button */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{submissions.length} total submissions</p>
                <div className="relative">
                  <button type="button" onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm">
                    <Download className="w-3.5 h-3.5" />Export Reports
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {exportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                      <div className="absolute right-0 top-10 z-20 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
                        <div className="px-4 py-2 border-b border-gray-50">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Export as</p>
                        </div>
                        <button type="button"
                          onClick={() => { setExportMenuOpen(false); exportReportsPDF(submissions, checklist, maxScore, kpis); toast.success("PDF report downloading…"); }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <FileDown className="w-4 h-4 text-red-500" />Export as PDF
                        </button>
                        <button type="button"
                          onClick={() => { setExportMenuOpen(false); exportHistoryExcel(submissions, checklist.data.title, maxScore); toast.success("Excel file downloading…"); }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />Export as Excel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <KpiCard label="Total Submissions" value={submissions.length.toString()}
                  icon={<Users className="w-5 h-5 text-[#2abaad]" />} iconBg="bg-teal-50" />
                <KpiCard label="Avg. Score" value={submissions.length ? `${avgScore}%` : "—"}
                  icon={<Award className="w-5 h-5 text-violet-600" />} iconBg="bg-violet-50"
                  sub={submissions.length ? (avgScore >= 80 ? "above target" : "below target") : undefined}
                  subColor={avgScore >= 80 ? "text-teal-600" : "text-red-500"} />
                <KpiCard label="Approval Rate" value={submissions.length ? `${approvalRate}%` : "—"}
                  icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-50"
                  sub={`${submissions.filter((s) => s.status === "validated").length} approved`} />
              </div>

              {submissions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-14 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No submissions yet</p>
                  <p className="text-sm text-gray-400 mt-1">Charts will appear once people start submitting this checklist.</p>
                </div>
              ) : (
                <>
                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Score trend */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">Score Trend</h3>
                          <p className="text-xs text-gray-400 mt-0.5">Submission scores over time{maxScore ? " (%)" : ""}</p>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Info className="w-3.5 h-3.5" />Last {scoreTrend.length} submissions
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={scoreTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                          <YAxis domain={maxScore ? [0, 100] : ["auto", "auto"]} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
                            formatter={(v: number) => [maxScore ? `${v}%` : v, "Score"]}
                            labelFormatter={(_, p) => p[0]?.payload?.user ?? ""} />
                          <Line type="monotone" dataKey="score" stroke="#2abaad" strokeWidth={2.5}
                            dot={{ fill: "#2abaad", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                          {maxScore > 0 && (
                            <Line type="monotone" dataKey={() => 80} stroke="#e5e7eb" strokeDasharray="4 4"
                              strokeWidth={1.5} dot={false} legendType="none" />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                      {maxScore > 0 && <p className="text-[10px] text-gray-400 mt-2 text-right">— dashed line = 80% target</p>}
                    </div>

                    {/* Status donut */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-800">Status Breakdown</h3>
                        <p className="text-xs text-gray-400 mt-0.5">All submissions</p>
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={statusBreak} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                            paddingAngle={3} dataKey="value">
                            {statusBreak.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5 mt-2">
                        {statusBreak.map((s) => (
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

                  {/* Subs per day */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-800">Submissions per Day</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Current week</p>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={subsPerDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
                          formatter={(v: number) => [v, "Submissions"]} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {subsPerDay.map((d, i) => <Cell key={i} fill={d.isToday ? "#2abaad" : "#e2f8f6"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-gray-400 mt-1">Highlighted bar = today</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════ HISTORY ════════ */}
          {activeTab === "history" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/40">
                <p className="text-sm font-medium text-gray-700">
                  {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
                </p>
                <button type="button"
                  onClick={() => { exportHistoryExcel(submissions, checklist.data.title, maxScore); toast.success("Excel file downloading…"); }}
                  disabled={submissions.length === 0}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />Export as Excel
                </button>
              </div>

              {/* Desktop header */}
              <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_150px_100px_110px_48px] gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/60">
                {["User", "Date & Time", "Score", "Status", ""].map((h) => (
                  <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>

              {submissions.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No submissions yet</p>
                  <p className="text-sm text-gray-400 mt-1">Submission history will appear here once people complete this checklist.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {[...submissions].sort((a, b) => b.submittedAt - a.submittedAt).map((sub) => (
                    <SubmissionRow
                      key={sub.id}
                      sub={sub}
                      maxScore={maxScore}
                      loading={loadingDetail && selectedSubmission?.id === sub.id}
                      onClick={() => openSubmissionDetail(sub)}
                    />
                  ))}
                </div>
              )}

              <div className="px-4 sm:px-6 py-3 border-t border-gray-50 bg-gray-50/40">
                <p className="text-xs text-gray-400">Click a row to view the full submission and export it as PDF.</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ════════ DETAIL PANEL ════════ */}
      {selectedSubmission && (
        <SubmissionDetailPanel
          submission={selectedSubmission}
          checklist={checklist}
          maxScore={maxScore}
          onClose={() => setSelectedSubmission(null)}
          onExportPDF={() => {
            exportSubmissionPDF(selectedSubmission, checklist, maxScore);
            toast.success("PDF downloading…");
          }}
        />
      )}
    </div>
  );
}

/* ─────────────── Submission Detail Panel ─────────────── */

function SubmissionDetailPanel({
  submission, checklist, maxScore, onClose, onExportPDF,
}: {
  submission: Submission; checklist: ChecklistData; maxScore: number;
  onClose: () => void; onExportPDF: () => void;
}) {
  const scorePct    = maxScore ? pct(submission.totalScore, maxScore) : null;
  const scoreColor  = scorePct === null ? "#6b7280" : scorePct >= 90 ? "#2abaad" : scorePct >= 70 ? "#f59e0b" : "#ef4444";
  const fields      = checklist.data.canvasFields ?? [];

  const statusConfig: Record<string, { label: string; cls: string }> = {
    validated: { label: "Approved",  cls: "bg-teal-50 text-teal-700 border-teal-200" },
    submitted: { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
    rejected:  { label: "Rejected",  cls: "bg-red-50 text-red-600 border-red-200" },
    draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const sc = statusConfig[submission.status] ?? statusConfig.submitted;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-xl bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{submission.submittedByEmail}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />{formatTs(submission.submittedAt)}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.cls}`}>
                {sc.label}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score banner */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Score</span>
            <span className="text-2xl font-bold" style={{ color: scoreColor }}>
              {scorePct !== null ? `${scorePct}%` : submission.totalScore}
              <span className="text-sm font-normal text-gray-400 ml-1">
                {maxScore ? `${submission.totalScore}/${maxScore} pts` : `${submission.totalScore} pts`}
              </span>
            </span>
          </div>
          {maxScore > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full transition-all" style={{ width: `${scorePct}%`, backgroundColor: scoreColor }} />
            </div>
          )}
        </div>

        {/* Answers */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {(!submission.answers || submission.answers.length === 0) ? (
            <div className="text-center py-10 text-gray-400">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No answer details available for this submission.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submission.answers.map((ans, idx) => {
                const field     = fields.find((f: any) => f.id === ans.fieldId);
                const label     = field?.label ?? field?.question ?? `Question ${idx + 1}`;
                const fieldMax  = field?.maxScore ?? field?.points ?? 0;
                const ansScore  = ans.score ?? 0;
                const isCorrect = fieldMax > 0 && ansScore === fieldMax;
                const isWrong   = fieldMax > 0 && ansScore === 0;
                const isPartial = fieldMax > 0 && ansScore > 0 && ansScore < fieldMax;
                const rowBg     = isWrong ? "bg-red-50/50" : isPartial ? "bg-amber-50/50" : "";

                const val = Array.isArray(ans.value)
                  ? ans.value.join(", ")
                  : typeof ans.value === "boolean"
                  ? (ans.value ? "Yes" : "No")
                  : String(ans.value ?? "—");

                const ansIcon = val === "Yes" || isCorrect
                  ? <CheckSquare className="w-4 h-4 text-teal-500 shrink-0" />
                  : val === "No" || isWrong
                  ? <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  : isPartial
                  ? <MinusSquare className="w-4 h-4 text-amber-500 shrink-0" />
                  : val.startsWith("data:image") || val.startsWith("data:video")
                  ? <Camera className="w-4 h-4 text-gray-400 shrink-0" />
                  : <Type className="w-4 h-4 text-gray-400 shrink-0" />;

                const ansColor = isCorrect ? "text-teal-600" : isWrong ? "text-red-500" : isPartial ? "text-amber-600" : "text-gray-700";

                return (
                  <div key={ans.fieldId ?? idx} className={`border border-gray-100 rounded-xl px-4 py-3 ${rowBg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {ansIcon}
                        <div className="min-w-0">
                          <p className="text-xs text-gray-600 leading-relaxed">{label}</p>
                          <p className={`text-xs font-semibold mt-0.5 ${ansColor} break-words`}>
                            {val.length > 80 ? val.substring(0, 80) + "…" : val}
                          </p>
                          {ans.note && (
                            <div className="flex items-start gap-1.5 mt-1.5">
                              <MessageSquare className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-amber-700 italic">{ans.note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {fieldMax > 0 && (
                        <span className={`text-xs font-bold shrink-0 ${ansColor}`}>{ansScore}/{fieldMax}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0">
          <button type="button" onClick={onExportPDF}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2abaad] text-white rounded-xl text-sm font-semibold hover:bg-[#24a699] transition-colors shadow-sm shadow-teal-100">
            <FileDown className="w-4 h-4" />
            Export this submission as PDF
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────── Submission Row ─────────────── */

function SubmissionRow({ sub, maxScore, loading, onClick }: {
  sub: Submission; maxScore: number; loading: boolean; onClick: () => void;
}) {
  const scorePct   = maxScore ? pct(sub.totalScore, maxScore) : null;
  const scoreColor = scorePct === null ? "text-gray-600" : scorePct >= 90 ? "text-teal-600" : scorePct >= 70 ? "text-amber-600" : "text-red-500";

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    validated: { label: "Approved", icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: "bg-teal-50 text-teal-700 border-teal-200" },
    submitted: { label: "Pending",  icon: <AlertCircle  className="w-3.5 h-3.5" />, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    rejected:  { label: "Rejected", icon: <XCircle      className="w-3.5 h-3.5" />, cls: "bg-red-50 text-red-600 border-red-200" },
    draft:     { label: "Draft",    icon: <Clock        className="w-3.5 h-3.5" />, cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const sc = statusConfig[sub.status] ?? statusConfig.submitted;

  const initial = (sub.submittedByEmail ?? "?")[0].toUpperCase();
  const colors  = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-teal-100 text-teal-700",
                   "bg-orange-100 text-orange-700", "bg-emerald-100 text-emerald-700"];
  const color   = colors[sub.submittedByEmail.charCodeAt(0) % colors.length];

  return (
    <>
      {/* Desktop */}
      <div onClick={onClick}
        className="hidden sm:grid grid-cols-[minmax(0,1fr)_150px_100px_110px_48px] gap-3 items-center px-6 py-3.5 hover:bg-teal-50/30 cursor-pointer transition-colors group">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>{initial}</div>
          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-[#2abaad] transition-colors">{sub.submittedByEmail}</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate text-xs">{formatTs(sub.submittedAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold ${scoreColor}`}>
            {scorePct !== null ? `${scorePct}%` : sub.totalScore}
          </span>
          {maxScore > 0 && <span className="text-xs text-gray-400">{sub.totalScore}/{maxScore}</span>}
        </div>
        <div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.cls}`}>
            {sc.icon}{sc.label}
          </span>
        </div>
        <div className="flex items-center justify-center">
          {loading
            ? <Loader2 className="w-4 h-4 text-[#2abaad] animate-spin" />
            : <Eye className="w-4 h-4 text-gray-400 group-hover:text-[#2abaad] transition-colors" />}
        </div>
      </div>

      {/* Mobile */}
      <div onClick={onClick} className="sm:hidden px-4 py-4 hover:bg-teal-50/30 cursor-pointer transition-colors">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>{initial}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{sub.submittedByEmail}</p>
              <p className="text-xs text-gray-400">{formatTs(sub.submittedAt)}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${sc.cls}`}>
            {sc.icon}{sc.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-gray-400" />
            <span className={`text-sm font-bold ${scoreColor}`}>{scorePct !== null ? `${scorePct}%` : sub.totalScore}</span>
            {maxScore > 0 && <span className="text-xs text-gray-400">({sub.totalScore}/{maxScore})</span>}
          </div>
          {loading ? <Loader2 className="w-4 h-4 text-[#2abaad] animate-spin" /> : <Eye className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
    </>
  );
}

/* ─────────────── Helpers ─────────────── */

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-teal-50 text-[#2abaad]" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
      {children}
    </button>
  );
}

function KpiCard({ label, value, icon, iconBg, sub, subColor = "text-gray-400" }: {
  label: string; value: string; icon: React.ReactNode; iconBg: string; sub?: string; subColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
        </div>
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>{icon}</div>
      </div>
    </div>
  );
}

