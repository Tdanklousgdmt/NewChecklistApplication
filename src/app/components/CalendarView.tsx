import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  FileEdit,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d5ac9b81`;

const STATUSES = [
  { id: "active",    label: "Active",       color: "bg-green-500",  textColor: "text-green-600",  borderColor: "border-green-200",  cardBg: "bg-green-50"  },
  { id: "draft",     label: "Draft",        color: "bg-slate-400",  textColor: "text-slate-600",  borderColor: "border-slate-200",  cardBg: "bg-slate-50"  },
  { id: "submitted", label: "Submitted",    color: "bg-blue-400",   textColor: "text-blue-600",   borderColor: "border-blue-200",   cardBg: "bg-blue-50"   },
  { id: "validated", label: "Validated",    color: "bg-teal-500",   textColor: "text-teal-600",   borderColor: "border-teal-200",   cardBg: "bg-teal-50"   },
  { id: "rejected",  label: "Rejected",     color: "bg-red-500",    textColor: "text-red-600",    borderColor: "border-red-200",    cardBg: "bg-red-50"    },
  { id: "archived",  label: "Archived",     color: "bg-gray-400",   textColor: "text-gray-600",   borderColor: "border-gray-200",   cardBg: "bg-gray-50"   },
] as const;

type StatusId = typeof STATUSES[number]["id"];

function getStatusConfig(status: string) {
  return STATUSES.find((s) => s.id === status) ?? {
    id: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    color: "bg-gray-400",
    textColor: "text-gray-600",
    borderColor: "border-gray-200",
    cardBg: "bg-gray-50",
  };
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "active":    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "submitted": return <Clock className="w-4 h-4 text-blue-400" />;
    case "validated": return <CheckCircle2 className="w-4 h-4 text-teal-500" />;
    case "rejected":  return <XCircle className="w-4 h-4 text-red-500" />;
    case "archived":  return <AlertCircle className="w-4 h-4 text-gray-400" />;
    default:          return <FileEdit className="w-4 h-4 text-slate-500" />;
  }
}

interface RealChecklist {
  id: string;
  title: string;
  status: string;
  location?: string;
  frequency?: string;
  priority?: string;
  createdAt: number;
  updatedAt: number;
  validFrom?: string;
  category?: string;
}

// Returns midnight of a timestamp's local date for easy day comparison
function toMidnight(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function CalendarView() {
  const today = new Date();
  // endDate = last column (today); we show 6 days ending here
  const [endDate, setEndDate] = useState(today);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [checklists, setChecklists] = useState<RealChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklists = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/checklists`, {
        headers: {
          "apikey": publicAnonKey,
          "Authorization": `Bearer ${publicAnonKey}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setChecklists(data.checklists ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load checklists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChecklists(); }, []);

  // Build 6-day column array ending at endDate
  const getDayColumns = (): Date[] => {
    const cols: Date[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      cols.push(d);
    }
    return cols;
  };

  const dayColumns = getDayColumns();

  const getChecklistsForDate = (date: Date): RealChecklist[] => {
    const dayMs = startOfDay(date);
    return checklists
      .filter((cl) => toMidnight(cl.createdAt) === dayMs)
      .sort((a, b) => a.createdAt - b.createdAt);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const formatDayOfWeek = (date: Date) =>
    date.toLocaleDateString("en-US", { weekday: "short" });

  const isToday = (date: Date) =>
    startOfDay(date) === startOfDay(today);

  const handlePrevious = () => {
    const d = new Date(endDate);
    d.setDate(d.getDate() - 6);
    setEndDate(d);
  };

  const handleNext = () => {
    const d = new Date(endDate);
    d.setDate(d.getDate() + 6);
    setEndDate(d);
  };

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setEndDate(new Date(customEndDate));
    }
  };

  const totalInRange = dayColumns.reduce(
    (sum, d) => sum + getChecklistsForDate(d).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
            <div className="text-sm font-medium text-gray-700">
              {formatDate(dayColumns[0])} – {formatDate(dayColumns[5])}
            </div>
            <button
              type="button"
              onClick={() => setEndDate(new Date())}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-3">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all"
            />
            <span className="text-sm text-gray-400">→</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all"
            />
            <button
              type="button"
              onClick={handleApplyCustomRange}
              className="px-4 py-1.5 bg-[#2abaad] text-white rounded-lg text-sm font-medium hover:bg-[#24a699] transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={fetchChecklists}
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading / error states */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-[#2abaad] animate-spin" />
          <p className="text-sm text-gray-400">Loading checklists…</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchChecklists}
            className="ml-auto px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Calendar grid */}
      {!loading && !error && (
        <>
          {checklists.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex flex-col items-center gap-3 text-center">
              <CalendarIcon className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-400 font-medium">No checklists created yet</p>
              <p className="text-xs text-gray-300">Checklists you create will appear here on their creation date</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
              {/* Summary bar */}
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
                <span className="text-xs text-gray-400">
                  {totalInRange === 0
                    ? "No checklists in this range"
                    : `${totalInRange} checklist${totalInRange > 1 ? "s" : ""} in this range`}
                </span>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400">
                  {checklists.length} total
                </span>
              </div>

              <div className="grid grid-cols-6 gap-4 min-w-[900px]">
                {dayColumns.map((date, colIdx) => {
                  const items = getChecklistsForDate(date);
                  const isTodayDate = isToday(date);

                  return (
                    <div key={colIdx} className="flex flex-col">
                      {/* Day header */}
                      <div
                        className={`text-center pb-3 mb-4 border-b-2 ${
                          isTodayDate ? "border-[#2abaad]" : "border-gray-100"
                        }`}
                      >
                        <div
                          className={`text-xs uppercase tracking-wide mb-1 ${
                            isTodayDate ? "text-[#2abaad] font-semibold" : "text-gray-500"
                          }`}
                        >
                          {formatDayOfWeek(date)}
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            isTodayDate ? "text-[#2abaad]" : "text-gray-700"
                          }`}
                        >
                          {date.getDate()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {date.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                        {isTodayDate && (
                          <div className="mt-1">
                            <span className="inline-block px-2 py-0.5 bg-[#2abaad] text-white text-[10px] font-medium rounded-full">
                              Today
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Cards */}
                      <div className="space-y-3 flex-1">
                        {items.length === 0 ? (
                          <div className="text-center py-8 text-xs text-gray-300">
                            —
                          </div>
                        ) : (
                          items.map((cl) => {
                            const sc = getStatusConfig(cl.status);
                            const createdTime = new Date(cl.createdAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            return (
                              <div
                                key={cl.id}
                                className={`rounded-lg border ${sc.borderColor} ${sc.cardBg} p-3 hover:shadow-md transition-all duration-200 cursor-pointer`}
                              >
                                {/* Created time */}
                                <div className="flex items-center gap-1 mb-2">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-400">{createdTime}</span>
                                </div>

                                {/* Status badge */}
                                <div className="flex items-center gap-1.5 mb-2">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${sc.color}`} />
                                  <span className={`text-[10px] font-medium ${sc.textColor}`}>
                                    {sc.label}
                                  </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">
                                  {cl.title || "Untitled"}
                                </h3>

                                {/* Location / category */}
                                {(cl.location || cl.category) && (
                                  <p className="text-[10px] text-gray-400 line-clamp-1">
                                    {cl.location || cl.category}
                                  </p>
                                )}

                                {/* Frequency pill */}
                                {cl.frequency && (
                                  <span className="inline-block mt-2 px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 text-[9px] text-gray-400">
                                    {cl.frequency.replace("_", " ")}
                                  </span>
                                )}

                                {/* Status icon */}
                                <div className="mt-2 pt-2 border-t border-gray-200/50">
                                  <StatusIcon status={cl.status} />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
