/**
 * DESIGN MOCKUP – Checklist Detail / Analytics Page
 * Uses mock data. Wired to real services once design is approved.
 */

import { useState } from "react";
import {
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileEdit,
  Users,
  TrendingUp,
  Award,
  Timer,
  BookOpen,
  ChevronDown,
  CalendarDays,
  UserCircle,
  CheckCheck,
  AlertCircle,
  XCircle,
  Eye,
  Tag,
  BarChart3,
  History,
  Info,
  FileSpreadsheet,
  FileDown,
  Download,
  X,
  CheckSquare,
  MinusSquare,
  MessageSquare,
  Camera,
  Type,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { toast } from "sonner";

/* ─────────────── Mock data ─────────────── */

const VERSIONS = [
  { label: "v3.1 (current)", value: "v3.1", status: "published" as const },
  { label: "v3.0",           value: "v3.0", status: "published" as const },
  { label: "v2.5",           value: "v2.5", status: "published" as const },
  { label: "v2.0-draft",     value: "v2.0", status: "draft"     as const },
  { label: "v1.0",           value: "v1.0", status: "published" as const },
];

const CHECKLIST_INFO = {
  title: "Morning Safety Inspection",
  category: "Safety",
  fieldsCount: 24,
  createdBy: "J. Martin",
  createdAt: "Jan 12, 2024",
  description:
    "Daily safety walkthrough for the production floor before shift start. Covers PPE compliance, machinery checks, emergency exits, and hazard identification.",
};

type SubmissionStatus = "approved" | "submitted" | "rejected" | "draft";
type AnswerType = "yes_no" | "text" | "photo" | "score";

interface MockAnswer {
  id: string;
  question: string;
  type: AnswerType;
  answer: string;
  score: number;
  maxScore: number;
  note?: string;
}

interface MockSection {
  id: string;
  title: string;
  answers: MockAnswer[];
  score: number;
  maxScore: number;
}

interface MockSubmission {
  id: string;
  user: string;
  userInitials: string;
  userColor: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  timeTaken: string;
  status: SubmissionStatus;
  savedDraftFirst: boolean;
  version: string;
  sections: MockSection[];
}

const MOCK_SECTIONS_SD: MockSection[] = [
  {
    id: "sec1", title: "PPE Compliance", score: 6, maxScore: 8,
    answers: [
      { id: "a1", question: "Is PPE available and accessible for all workers?", type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a2", question: "Are hard hats worn by all personnel on the floor?",  type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a3", question: "Safety shoes compliant with EN ISO 20345?",          type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a4", question: "Hi-viz vests visible and undamaged?",                type: "yes_no", answer: "No",  score: 0, maxScore: 2, note: "3 workers missing vests near line B" },
    ],
  },
  {
    id: "sec2", title: "Machinery & Equipment", score: 7, maxScore: 8,
    answers: [
      { id: "a5", question: "All machine guards in place and secured?",         type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a6", question: "Emergency stop buttons tested and functional?",    type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a7", question: "Oil and hydraulic levels within safe range?",      type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a8", question: "Lockout/Tagout procedures applied where required?", type: "yes_no", answer: "Partial", score: 1, maxScore: 2, note: "Station 4 not fully tagged" },
    ],
  },
  {
    id: "sec3", title: "Emergency & Fire Safety", score: 9, maxScore: 8,
    answers: [
      { id: "a9",  question: "All fire exits clear and unobstructed?",            type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a10", question: "Fire extinguishers visible, charged, and in date?", type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a11", question: "Assembly point clearly marked and accessible?",     type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a12", question: "Fire alarm tested within the last 7 days?",         type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
    ],
  },
];

const MOCK_SECTIONS_TM: MockSection[] = [
  {
    id: "sec1", title: "PPE Compliance", score: 2, maxScore: 8,
    answers: [
      { id: "a1", question: "Is PPE available and accessible for all workers?", type: "yes_no", answer: "Yes",  score: 2, maxScore: 2 },
      { id: "a2", question: "Are hard hats worn by all personnel on the floor?", type: "yes_no", answer: "No",  score: 0, maxScore: 2, note: "Multiple workers without hard hats on line A" },
      { id: "a3", question: "Safety shoes compliant with EN ISO 20345?",         type: "yes_no", answer: "No",  score: 0, maxScore: 2, note: "Non-compliant footwear observed" },
      { id: "a4", question: "Hi-viz vests visible and undamaged?",               type: "yes_no", answer: "No",  score: 0, maxScore: 2, note: "Vests missing entirely" },
    ],
  },
  {
    id: "sec2", title: "Machinery & Equipment", score: 7, maxScore: 8,
    answers: [
      { id: "a5", question: "All machine guards in place and secured?",          type: "yes_no", answer: "Yes",     score: 2, maxScore: 2 },
      { id: "a6", question: "Emergency stop buttons tested and functional?",     type: "yes_no", answer: "Yes",     score: 2, maxScore: 2 },
      { id: "a7", question: "Oil and hydraulic levels within safe range?",       type: "yes_no", answer: "Yes",     score: 2, maxScore: 2 },
      { id: "a8", question: "Lockout/Tagout procedures applied where required?", type: "yes_no", answer: "Partial", score: 1, maxScore: 2 },
    ],
  },
  {
    id: "sec3", title: "Emergency & Fire Safety", score: 6, maxScore: 8,
    answers: [
      { id: "a9",  question: "All fire exits clear and unobstructed?",            type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a10", question: "Fire extinguishers visible, charged, and in date?", type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a11", question: "Assembly point clearly marked and accessible?",     type: "yes_no", answer: "Yes", score: 2, maxScore: 2 },
      { id: "a12", question: "Fire alarm tested within the last 7 days?",         type: "yes_no", answer: "No",  score: 0, maxScore: 2, note: "Alarm test overdue by 4 days" },
    ],
  },
];

const MOCK_SUBMISSIONS: MockSubmission[] = [
  { id: "s1",  user: "Sophie Dupont",  userInitials: "SD", userColor: "bg-violet-100 text-violet-700",  submittedAt: "Today, 07:42",      score: 22, maxScore: 24, timeTaken: "8 min",  status: "approved",  savedDraftFirst: false, version: "v3.1", sections: MOCK_SECTIONS_SD },
  { id: "s2",  user: "Marc Lefebvre",  userInitials: "ML", userColor: "bg-blue-100 text-blue-700",      submittedAt: "Today, 06:15",      score: 19, maxScore: 24, timeTaken: "14 min", status: "submitted", savedDraftFirst: true,  version: "v3.1", sections: MOCK_SECTIONS_TM },
  { id: "s3",  user: "Julie Bernard",  userInitials: "JB", userColor: "bg-teal-100 text-teal-700",      submittedAt: "Yesterday, 07:55",  score: 24, maxScore: 24, timeTaken: "6 min",  status: "approved",  savedDraftFirst: false, version: "v3.1", sections: MOCK_SECTIONS_SD },
  { id: "s4",  user: "Thomas Moreau",  userInitials: "TM", userColor: "bg-orange-100 text-orange-700",  submittedAt: "Yesterday, 06:30",  score: 15, maxScore: 24, timeTaken: "22 min", status: "rejected",  savedDraftFirst: true,  version: "v3.1", sections: MOCK_SECTIONS_TM },
  { id: "s5",  user: "Sophie Dupont",  userInitials: "SD", userColor: "bg-violet-100 text-violet-700",  submittedAt: "Mar 17, 07:48",     score: 21, maxScore: 24, timeTaken: "9 min",  status: "approved",  savedDraftFirst: false, version: "v3.0", sections: MOCK_SECTIONS_SD },
  { id: "s6",  user: "Marc Lefebvre",  userInitials: "ML", userColor: "bg-blue-100 text-blue-700",      submittedAt: "Mar 17, 06:20",     score: 23, maxScore: 24, timeTaken: "7 min",  status: "approved",  savedDraftFirst: false, version: "v3.0", sections: MOCK_SECTIONS_SD },
  { id: "s7",  user: "Alex Nguyen",    userInitials: "AN", userColor: "bg-emerald-100 text-emerald-700",submittedAt: "Mar 16, 07:30",     score: 18, maxScore: 24, timeTaken: "18 min", status: "approved",  savedDraftFirst: true,  version: "v3.0", sections: MOCK_SECTIONS_TM },
  { id: "s8",  user: "Julie Bernard",  userInitials: "JB", userColor: "bg-teal-100 text-teal-700",      submittedAt: "Mar 16, 06:55",     score: 20, maxScore: 24, timeTaken: "11 min", status: "approved",  savedDraftFirst: false, version: "v3.0", sections: MOCK_SECTIONS_SD },
  { id: "s9",  user: "Thomas Moreau",  userInitials: "TM", userColor: "bg-orange-100 text-orange-700",  submittedAt: "Mar 15, 08:10",     score: 12, maxScore: 24, timeTaken: "31 min", status: "rejected",  savedDraftFirst: true,  version: "v3.0", sections: MOCK_SECTIONS_TM },
  { id: "s10", user: "Sophie Dupont",  userInitials: "SD", userColor: "bg-violet-100 text-violet-700",  submittedAt: "Mar 14, 07:50",     score: 24, maxScore: 24, timeTaken: "5 min",  status: "approved",  savedDraftFirst: false, version: "v3.0", sections: MOCK_SECTIONS_SD },
];

const SCORE_TREND = [
  { date: "Mar 14", score: 100 }, { date: "Mar 15", score: 50 },
  { date: "Mar 16 (1)", score: 75 }, { date: "Mar 16 (2)", score: 83 },
  { date: "Mar 17 (1)", score: 96 }, { date: "Mar 17 (2)", score: 88 },
  { date: "Mar 18", score: 63 },
  { date: "Mar 19 (1)", score: 100 }, { date: "Mar 19 (2)", score: 79 }, { date: "Mar 19 (3)", score: 92 },
];

const SUBS_PER_DAY = [
  { day: "Mon", count: 3 }, { day: "Tue", count: 4 }, { day: "Wed", count: 2 },
  { day: "Thu", count: 5 }, { day: "Fri", count: 4 }, { day: "Sat", count: 1 }, { day: "Sun", count: 2 },
];

const STATUS_BREAKDOWN = [
  { name: "Approved", value: 7, color: "#2abaad" },
  { name: "Pending",  value: 1, color: "#f59e0b" },
  { name: "Rejected", value: 2, color: "#ef4444" },
];

/* ─────────────── Helpers ─────────────── */

const simulateExport = (type: "excel" | "pdf", label: string) => {
  toast.success(`${label} exported as ${type.toUpperCase()}`, {
    description: "Your file is ready to download.",
    duration: 3000,
  });
};

/* ─────────────── Main Component ─────────────── */

interface ChecklistDetailDesignProps {
  onBack?: () => void;
}

export function ChecklistDetailDesign({ onBack }: ChecklistDetailDesignProps) {
  const [selectedVersion, setSelectedVersion] = useState(VERSIONS[0]);
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [versionOpen, setVersionOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<MockSubmission | null>(null);

  const filteredSubs = MOCK_SUBMISSIONS.filter(
    (s) => s.version === selectedVersion.value || selectedVersion.value === "v3.1"
  );

  const avgScore     = Math.round(filteredSubs.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / filteredSubs.length);
  const avgTimeMins  = Math.round(filteredSubs.reduce((a, s) => a + parseInt(s.timeTaken), 0) / filteredSubs.length);
  const approvalRate = Math.round((filteredSubs.filter((s) => s.status === "approved").length / filteredSubs.length) * 100);
  const draftCount   = filteredSubs.filter((s) => s.savedDraftFirst).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[#2abaad] tracking-wide uppercase text-xs font-medium shrink-0">eCheck</span>
          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
          <button type="button" onClick={onBack}
            className="text-gray-500 tracking-wide uppercase text-xs hover:text-[#2abaad] transition-colors shrink-0">
            Library
          </button>
          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
          <span className="text-gray-700 tracking-wide uppercase text-xs truncate">{CHECKLIST_INFO.title}</span>
        </div>
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs tracking-wide hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Library</span>
        </button>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">

          {/* ── Checklist info card ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCheck className="w-6 h-6 text-[#2abaad]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-lg sm:text-xl font-bold text-gray-800">{CHECKLIST_INFO.title}</h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                      <CheckCircle2 className="w-3 h-3" /> Published
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{CHECKLIST_INFO.description}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{CHECKLIST_INFO.category}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><FileEdit className="w-3 h-3" />{CHECKLIST_INFO.fieldsCount} fields</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><UserCircle className="w-3 h-3" />Created by {CHECKLIST_INFO.createdBy}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{CHECKLIST_INFO.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* Version selector */}
              <div className="shrink-0">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Version</p>
                <div className="relative">
                  <button type="button" onClick={() => setVersionOpen(!versionOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-gray-300 transition-colors min-w-[165px] justify-between">
                    <span className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedVersion.status === "published" ? "bg-teal-500" : "bg-slate-400"}`} />
                      <span className="font-medium">{selectedVersion.label}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${versionOpen ? "rotate-180" : ""}`} />
                  </button>
                  {versionOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setVersionOpen(false)} />
                      <div className="absolute right-0 top-11 z-20 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
                        {VERSIONS.map((v) => (
                          <button key={v.value} type="button"
                            onClick={() => { setSelectedVersion(v); setVersionOpen(false); }}
                            className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors ${
                              v.value === selectedVersion.value ? "bg-teal-50 text-[#2abaad] font-medium" : "text-gray-700 hover:bg-gray-50"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${v.status === "published" ? "bg-teal-500" : "bg-slate-400"}`} />
                            {v.label}
                            {v.value === selectedVersion.value && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tab bar ── */}
          <div className="flex items-center gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1.5">
            <TabBtn active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
              <BarChart3 className="w-4 h-4" />Overview &amp; Reports
            </TabBtn>
            <TabBtn active={activeTab === "history"} onClick={() => setActiveTab("history")}>
              <History className="w-4 h-4" />Submission History
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                {filteredSubs.length}
              </span>
            </TabBtn>
          </div>

          {/* ════════ OVERVIEW TAB ════════ */}
          {activeTab === "overview" && (
            <div className="space-y-5 sm:space-y-6">

              {/* Export reports row */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Showing data for <span className="font-medium text-gray-600">{selectedVersion.label}</span></p>
                <div className="relative">
                  <button type="button" onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm">
                    <Download className="w-3.5 h-3.5" />
                    Export Reports
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
                          onClick={() => { setExportMenuOpen(false); simulateExport("pdf", "Reports"); }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <FileDown className="w-4 h-4 text-red-500" />
                          Export as PDF
                        </button>
                        <button type="button"
                          onClick={() => { setExportMenuOpen(false); simulateExport("excel", "Reports"); }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          Export as Excel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <KpiCard label="Total Submissions" value={filteredSubs.length.toString()}
                  icon={<Users className="w-5 h-5 text-[#2abaad]" />} iconBg="bg-teal-50" sub="last 30 days" />
                <KpiCard label="Avg. Score" value={`${avgScore}%`}
                  icon={<Award className="w-5 h-5 text-violet-600" />} iconBg="bg-violet-50"
                  sub={avgScore >= 80 ? "above target" : "below target"}
                  subColor={avgScore >= 80 ? "text-teal-600" : "text-red-500"} />
                <KpiCard label="Approval Rate" value={`${approvalRate}%`}
                  icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-50"
                  sub={`${filteredSubs.filter((s) => s.status === "approved").length} approved`} />
                <KpiCard label="Avg. Time" value={`${avgTimeMins} min`}
                  icon={<Timer className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50"
                  sub={`${draftCount} saved draft first`} />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Score trend */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Score Trend</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Submission scores over time (%)</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Info className="w-3.5 h-3.5" />Last 10 submissions
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={SCORE_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
                        formatter={(v: number) => [`${v}%`, "Score"]} />
                      <Line type="monotone" dataKey="score" stroke="#2abaad" strokeWidth={2.5}
                        dot={{ fill: "#2abaad", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      <Line type="monotone" dataKey={() => 80} stroke="#e5e7eb" strokeDasharray="4 4"
                        strokeWidth={1.5} dot={false} legendType="none" />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-gray-400 mt-2 text-right">— dashed line = 80% target</p>
                </div>

                {/* Status donut */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-800">Status Breakdown</h3>
                    <p className="text-xs text-gray-400 mt-0.5">All submissions</p>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={STATUS_BREAKDOWN} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                        paddingAngle={3} dataKey="value">
                        {STATUS_BREAKDOWN.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {STATUS_BREAKDOWN.map((s) => (
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

              {/* Submissions per day */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Submissions per Day</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Current week</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={SUBS_PER_DAY} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
                      formatter={(v: number) => [v, "Submissions"]} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {SUBS_PER_DAY.map((_, i) => <Cell key={i} fill={i === 6 ? "#2abaad" : "#e2f8f6"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-gray-400 mt-1">Highlighted bar = today</p>
              </div>

            </div>
          )}

          {/* ════════ HISTORY TAB ════════ */}
          {activeTab === "history" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

              {/* History toolbar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/40">
                <p className="text-sm font-medium text-gray-700">
                  {filteredSubs.length} submissions
                  <span className="text-gray-400 font-normal ml-1">· {selectedVersion.label}</span>
                </p>
                <button type="button"
                  onClick={() => simulateExport("excel", "Submission history")}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Export as Excel
                </button>
              </div>

              {/* Desktop column header */}
              <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_140px_100px_90px_110px_80px_48px] gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/60">
                {["User", "Date & Time", "Score", "Time Taken", "Status", "Draft?", ""].map((h) => (
                  <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>

              <div className="divide-y divide-gray-50">
                {filteredSubs.map((sub) => (
                  <SubmissionRow key={sub.id} sub={sub} onClick={() => setSelectedSubmission(sub)} />
                ))}
              </div>

              <div className="px-4 sm:px-6 py-3 border-t border-gray-50 bg-gray-50/40">
                <p className="text-xs text-gray-400">
                  Click a row to view the full submission detail and export it as PDF.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ════════ SUBMISSION DETAIL SLIDE-OVER ════════ */}
      {selectedSubmission && (
        <SubmissionDetailPanel
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
}

/* ─────────────── Submission Detail Panel ─────────────── */

function SubmissionDetailPanel({
  submission,
  onClose,
}: {
  submission: MockSubmission;
  onClose: () => void;
}) {
  const pct = Math.round((submission.score / submission.maxScore) * 100);
  const scoreColor = pct >= 90 ? "#2abaad" : pct >= 70 ? "#f59e0b" : "#ef4444";

  const statusConfig: Record<SubmissionStatus, { label: string; cls: string }> = {
    approved:  { label: "Approved",  cls: "bg-teal-50 text-teal-700 border-teal-200" },
    submitted: { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
    rejected:  { label: "Rejected",  cls: "bg-red-50 text-red-600 border-red-200" },
    draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const sc = statusConfig[submission.status];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-xl bg-white shadow-2xl flex flex-col">

        {/* Panel header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${submission.userColor}`}>
              {submission.userInitials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{submission.user}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />{submission.submittedAt}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Timer className="w-3 h-3" />{submission.timeTaken}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.cls}`}>
                  {sc.label}
                </span>
                {submission.savedDraftFirst && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                    <BookOpen className="w-3 h-3" />Saved draft first
                  </span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall score banner */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Score</span>
            <span className="text-2xl font-bold" style={{ color: scoreColor }}>
              {pct}%
              <span className="text-sm font-normal text-gray-400 ml-1">{submission.score}/{submission.maxScore} pts</span>
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: scoreColor }} />
          </div>
        </div>

        {/* Scrollable answers */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {submission.sections.map((section) => {
            const sectionPct = Math.round((section.score / section.maxScore) * 100);
            const sectionColor = sectionPct >= 90 ? "text-teal-600" : sectionPct >= 70 ? "text-amber-600" : "text-red-500";
            return (
              <div key={section.id} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">{section.title}</span>
                  <span className={`text-sm font-bold ${sectionColor}`}>
                    {section.score}/{section.maxScore} pts
                  </span>
                </div>
                {/* Answers */}
                <div className="divide-y divide-gray-50">
                  {section.answers.map((answer) => (
                    <AnswerRow key={answer.id} answer={answer} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Panel footer — export */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0">
          <button type="button"
            onClick={() => { simulateExport("pdf", `${submission.user} · ${submission.submittedAt}`); onClose(); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2abaad] text-white rounded-xl text-sm font-semibold hover:bg-[#24a699] transition-colors shadow-sm shadow-teal-100">
            <FileDown className="w-4 h-4" />
            Export this submission as PDF
          </button>
        </div>
      </div>
    </>
  );
}

function AnswerRow({ answer }: { answer: MockAnswer }) {
  const isCorrect  = answer.score === answer.maxScore;
  const isPartial  = answer.score > 0 && answer.score < answer.maxScore;
  const isWrong    = answer.score === 0;

  const answerIcon = answer.answer === "Yes"
    ? <CheckSquare className="w-4 h-4 text-teal-500 shrink-0" />
    : answer.answer === "Partial"
    ? <MinusSquare className="w-4 h-4 text-amber-500 shrink-0" />
    : answer.answer === "No"
    ? <XCircle className="w-4 h-4 text-red-400 shrink-0" />
    : answer.type === "photo"
    ? <Camera className="w-4 h-4 text-gray-400 shrink-0" />
    : <Type className="w-4 h-4 text-gray-400 shrink-0" />;

  const answerColor = isCorrect ? "text-teal-600" : isPartial ? "text-amber-600" : isWrong ? "text-red-500" : "text-gray-600";
  const rowBg       = isWrong ? "bg-red-50/40" : isPartial ? "bg-amber-50/40" : "";

  return (
    <div className={`px-4 py-3 ${rowBg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {answerIcon}
          <div className="min-w-0">
            <p className="text-xs text-gray-600 leading-relaxed">{answer.question}</p>
            <p className={`text-xs font-semibold mt-0.5 ${answerColor}`}>{answer.answer}</p>
            {answer.note && (
              <div className="flex items-start gap-1.5 mt-1.5">
                <MessageSquare className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 italic">{answer.note}</p>
              </div>
            )}
          </div>
        </div>
        <span className={`text-xs font-bold shrink-0 ${answerColor}`}>
          {answer.score}/{answer.maxScore}
        </span>
      </div>
    </div>
  );
}

/* ─────────────── Submission Row ─────────────── */

function SubmissionRow({ sub, onClick }: { sub: MockSubmission; onClick: () => void }) {
  const pct = Math.round((sub.score / sub.maxScore) * 100);
  const scoreColor = pct >= 90 ? "text-teal-600" : pct >= 70 ? "text-amber-600" : "text-red-500";

  const statusConfig: Record<SubmissionStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    approved:  { label: "Approved", icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: "bg-teal-50 text-teal-700 border-teal-200" },
    submitted: { label: "Pending",  icon: <AlertCircle  className="w-3.5 h-3.5" />, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    rejected:  { label: "Rejected", icon: <XCircle      className="w-3.5 h-3.5" />, cls: "bg-red-50 text-red-600 border-red-200" },
    draft:     { label: "Draft",    icon: <Clock        className="w-3.5 h-3.5" />, cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const sc = statusConfig[sub.status];

  return (
    <>
      {/* Desktop */}
      <div onClick={onClick}
        className="hidden sm:grid grid-cols-[minmax(0,1fr)_140px_100px_90px_110px_80px_48px] gap-3 items-center px-6 py-3.5 hover:bg-teal-50/30 cursor-pointer transition-colors group">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${sub.userColor}`}>
            {sub.userInitials}
          </div>
          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-[#2abaad] transition-colors">{sub.user}</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{sub.submittedAt}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${scoreColor}`}>{pct}%</span>
          <span className="text-xs text-gray-400">{sub.score}/{sub.maxScore}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Timer className="w-3.5 h-3.5 text-gray-400 shrink-0" />{sub.timeTaken}
        </div>
        <div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.cls}`}>
            {sc.icon}{sc.label}
          </span>
        </div>
        <div>
          {sub.savedDraftFirst
            ? <span className="inline-flex items-center gap-1 text-xs text-amber-600"><BookOpen className="w-3.5 h-3.5" />Yes</span>
            : <span className="text-xs text-gray-300">—</span>}
        </div>
        <div>
          <span className="p-1.5 rounded-lg text-gray-400 group-hover:text-[#2abaad] group-hover:bg-teal-50 transition-colors flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Mobile */}
      <div onClick={onClick}
        className="sm:hidden px-4 py-4 hover:bg-teal-50/30 cursor-pointer transition-colors">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${sub.userColor}`}>
              {sub.userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{sub.user}</p>
              <p className="text-xs text-gray-400">{sub.submittedAt}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${sc.cls}`}>
            {sc.icon}{sc.label}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-gray-400" />
            <span className={`text-sm font-bold ${scoreColor}`}>{pct}%</span>
            <span className="text-xs text-gray-400">({sub.score}/{sub.maxScore})</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Timer className="w-3.5 h-3.5 text-gray-400" />{sub.timeTaken}
          </div>
          {sub.savedDraftFirst && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <BookOpen className="w-3.5 h-3.5" />Saved draft first
            </span>
          )}
          <Eye className="w-4 h-4 text-gray-400 ml-auto" />
        </div>
      </div>
    </>
  );
}

/* ─────────────── Helpers ─────────────── */

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active ? "bg-teal-50 text-[#2abaad]" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      }`}>
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

