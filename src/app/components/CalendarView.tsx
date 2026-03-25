import { useState, useEffect, useRef } from "react";
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
import { SERVER_URL, buildAuthHeaders } from "../services/checklistService";

const STATUSES = [
  { id: "active",    label: "Active",     color: "bg-green-500",  textColor: "text-green-700",  borderColor: "border-green-200",  cardBg: "bg-green-50"  },
  { id: "draft",     label: "Draft",      color: "bg-slate-400",  textColor: "text-slate-700",  borderColor: "border-slate-200",  cardBg: "bg-slate-50"  },
  { id: "submitted", label: "Submitted",  color: "bg-blue-400",   textColor: "text-blue-700",   borderColor: "border-blue-200",   cardBg: "bg-blue-50"   },
  { id: "validated", label: "Validated",  color: "bg-teal-500",   textColor: "text-teal-700",   borderColor: "border-teal-200",   cardBg: "bg-teal-50"   },
  { id: "rejected",  label: "Rejected",   color: "bg-red-500",    textColor: "text-red-700",    borderColor: "border-red-200",    cardBg: "bg-red-50"    },
  { id: "archived",  label: "Archived",   color: "bg-gray-400",   textColor: "text-gray-700",   borderColor: "border-gray-200",   cardBg: "bg-gray-50"   },
] as const;

function getStatusConfig(status: string) {
  return (
    STATUSES.find((s) => s.id === status) ?? {
      id: status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      color: "bg-gray-400",
      textColor: "text-gray-700",
      borderColor: "border-gray-200",
      cardBg: "bg-gray-50",
    }
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "active":    return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case "submitted": return <Clock className="w-3.5 h-3.5 text-blue-400" />;
    case "validated": return <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />;
    case "rejected":  return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case "archived":  return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
    default:          return <FileEdit className="w-3.5 h-3.5 text-slate-500" />;
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

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
function toMidnight(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function CalendarView() {
  const today = new Date();
  // The "anchor" week: we display 7 days ending at anchorEnd
  const [anchorEnd, setAnchorEnd] = useState(today);
  // Selected day (for mobile single-day view)
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [checklists, setChecklists] = useState<RealChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stripRef = useRef<HTMLDivElement>(null);

  const fetchChecklists = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/checklists`, {
        headers: buildAuthHeaders(),
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

  // Build 7-day column array ending at anchorEnd
  const getDayColumns = (): Date[] => {
    const cols: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchorEnd);
      d.setDate(d.getDate() - i);
      cols.push(d);
    }
    return cols;
  };

  const dayColumns = getDayColumns();

  const getItemsForDate = (date: Date): RealChecklist[] =>
    checklists
      .filter((cl) => toMidnight(cl.createdAt) === startOfDay(date))
      .sort((a, b) => a.createdAt - b.createdAt);

  const isToday = (date: Date) => startOfDay(date) === startOfDay(today);
  const isSelected = (date: Date) => startOfDay(date) === startOfDay(selectedDay);

  const handlePrev = () => {
    const d = new Date(anchorEnd);
    d.setDate(d.getDate() - 7);
    setAnchorEnd(d);
    const newSelected = new Date(selectedDay);
    newSelected.setDate(newSelected.getDate() - 7);
    setSelectedDay(newSelected);
  };

  const handleNext = () => {
    const d = new Date(anchorEnd);
    d.setDate(d.getDate() + 7);
    setAnchorEnd(d);
    const newSelected = new Date(selectedDay);
    newSelected.setDate(newSelected.getDate() + 7);
    setSelectedDay(newSelected);
  };

  const handleToday = () => {
    setAnchorEnd(today);
    setSelectedDay(today);
  };

  const weekLabel = `${MONTH_LABELS[dayColumns[0].getMonth()]} ${dayColumns[0].getDate()} – ${
    dayColumns[0].getMonth() !== dayColumns[6].getMonth()
      ? MONTH_LABELS[dayColumns[6].getMonth()] + " "
      : ""
  }${dayColumns[6].getDate()}, ${dayColumns[6].getFullYear()}`;

  const totalInRange = dayColumns.reduce((s, d) => s + getItemsForDate(d).length, 0);
  const selectedItems = getItemsForDate(selectedDay);

  return (
    <div className="space-y-4">
      {/* ── Controls bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{weekLabel}</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={fetchChecklists}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading / error ── */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-[#2abaad] animate-spin" />
          <p className="text-sm text-gray-400">Loading checklists…</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button
            type="button"
            onClick={fetchChecklists}
            className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── MOBILE layout: day strip + list ── */}
          <div className="block lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Day strip */}
            <div
              ref={stripRef}
              className="flex border-b border-gray-100 overflow-x-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {dayColumns.map((date, i) => {
                const count = getItemsForDate(date).length;
                const todayDate = isToday(date);
                const sel = isSelected(date);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDay(date)}
                    className={`flex-1 min-w-[44px] flex flex-col items-center py-3 px-1 transition-all relative ${
                      sel
                        ? "bg-[#2abaad]/8"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Selected indicator */}
                    {sel && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#2abaad]" />
                    )}
                    <span
                      className={`text-[10px] uppercase tracking-wide mb-1 font-medium ${
                        todayDate ? "text-[#2abaad]" : sel ? "text-[#2abaad]" : "text-gray-400"
                      }`}
                    >
                      {DAY_LABELS[date.getDay()]}
                    </span>
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                        todayDate
                          ? "bg-[#2abaad] text-white"
                          : sel
                          ? "bg-[#2abaad]/15 text-[#2abaad]"
                          : "text-gray-700"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {/* Dot for items */}
                    <div className="mt-1.5 h-1.5">
                      {count > 0 && (
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                            sel ? "bg-[#2abaad]" : "bg-gray-300"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected day header */}
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </span>
                {isToday(selectedDay) && (
                  <span className="ml-2 px-2 py-0.5 bg-[#2abaad] text-white text-[10px] font-medium rounded-full">Today</span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Selected day items */}
            <div className="p-4">
              {selectedItems.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <CalendarIcon className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">Nothing scheduled</p>
                  <p className="text-xs text-gray-300 mt-1">No checklists were created on this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((cl) => (
                    <MobileChecklistCard key={cl.id} cl={cl} />
                  ))}
                </div>
              )}
            </div>

            {/* Range summary */}
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {totalInRange} checklist{totalInRange !== 1 ? "s" : ""} this week
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{checklists.length} total</span>
            </div>
          </div>

          {/* ── DESKTOP layout: 7-column grid ── */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
            {/* Summary */}
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
              <span className="text-xs text-gray-400">
                {totalInRange === 0
                  ? "No checklists in this range"
                  : `${totalInRange} checklist${totalInRange > 1 ? "s" : ""} this week`}
              </span>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">{checklists.length} total</span>
            </div>

            <div className="grid grid-cols-7 gap-3 min-w-[700px]">
              {dayColumns.map((date, colIdx) => {
                const items = getItemsForDate(date);
                const todayDate = isToday(date);

                return (
                  <div key={colIdx} className="flex flex-col min-h-[200px]">
                    {/* Day header */}
                    <div
                      className={`text-center pb-3 mb-3 border-b-2 ${
                        todayDate ? "border-[#2abaad]" : "border-gray-100"
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase tracking-wide mb-1 font-medium ${
                          todayDate ? "text-[#2abaad]" : "text-gray-400"
                        }`}
                      >
                        {DAY_LABELS[date.getDay()]}
                      </div>
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-full mx-auto text-sm font-semibold ${
                          todayDate ? "bg-[#2abaad] text-white" : "text-gray-700"
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {MONTH_LABELS[date.getMonth()]}
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2 flex-1">
                      {items.length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-200">—</div>
                      ) : (
                        items.map((cl) => (
                          <DesktopChecklistCard key={cl.id} cl={cl} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empty overall state */}
          {checklists.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center gap-3 text-center">
              <CalendarIcon className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-400 font-medium">No checklists created yet</p>
              <p className="text-xs text-gray-300">Checklists you create will appear here on their creation date</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Card components ── */

function MobileChecklistCard({ cl }: { cl: RealChecklist }) {
  const sc = getStatusConfig(cl.status);
  const time = new Date(cl.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className={`rounded-xl border ${sc.borderColor} ${sc.cardBg} p-3.5 hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer`}>
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className="mt-1 shrink-0">
          <StatusIcon status={cl.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{cl.title || "Untitled"}</h3>
            <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.cardBg} border ${sc.borderColor} ${sc.textColor}`}>
              {sc.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{time}
            </span>
            {cl.location && <><span>·</span><span className="truncate max-w-[120px]">{cl.location}</span></>}
            {cl.category && !cl.location && <><span>·</span><span>{cl.category}</span></>}
            {cl.frequency && (
              <span className="px-1.5 py-0.5 rounded-full bg-white/80 border border-gray-200 text-[10px]">
                {cl.frequency.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopChecklistCard({ cl }: { cl: RealChecklist }) {
  const sc = getStatusConfig(cl.status);
  const time = new Date(cl.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className={`rounded-lg border ${sc.borderColor} ${sc.cardBg} p-2.5 hover:shadow-md transition-all cursor-pointer`}>
      <div className="flex items-center gap-1 mb-1.5">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.color}`} />
        <span className={`text-[10px] font-medium ${sc.textColor}`}>{sc.label}</span>
      </div>
      <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">{cl.title || "Untitled"}</h3>
      <div className="flex items-center gap-1 text-[10px] text-gray-400">
        <Clock className="w-2.5 h-2.5" />
        <span>{time}</span>
      </div>
      {(cl.location || cl.category) && (
        <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{cl.location || cl.category}</p>
      )}
      {cl.frequency && (
        <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded-full bg-white/70 border border-gray-200 text-[9px] text-gray-400">
          {cl.frequency.replace("_", " ")}
        </span>
      )}
    </div>
  );
}
