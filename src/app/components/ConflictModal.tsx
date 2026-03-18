import { AlertTriangle, X, Copy, RefreshCw, Calendar, Repeat } from "lucide-react";
import { ChecklistVersion } from "../hooks/useAutosave";

interface ConflictModalProps {
  isOpen: boolean;
  localVersion: ChecklistVersion;
  serverVersion: ChecklistVersion; // carries the duplicate checklist in .data
  onResolve: (choice: "local" | "server") => void;
  onClose: () => void;
}

export function ConflictModal({
  isOpen,
  localVersion,
  serverVersion,
  onResolve,
  onClose,
}: ConflictModalProps) {
  if (!isOpen) return null;

  const duplicate   = serverVersion.data;
  const localData   = localVersion.data;

  const localTitle     = localData?.title     || "Untitled";
  const localFrequency = localData?.frequency || "—";
  const dupTitle       = duplicate?.title     || localTitle;
  const dupFrequency   = duplicate?.frequency || localFrequency;
  const dupStatus      = duplicate?.status    || "unknown";
  const dupCreatedAt   = duplicate?.createdAt
    ? new Date(duplicate.createdAt).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";
  const dupUpdatedAt   = duplicate?.updatedAt
    ? new Date(duplicate.updatedAt).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  const frequencyLabel = (f: string) =>
    f === "ONE_TIME" ? "One-time" : f === "RECURRING" ? "Recurring" : f;

  const statusColors: Record<string, string> = {
    draft:    "bg-gray-100 text-gray-600",
    active:   "bg-green-100 text-green-700",
    archived: "bg-red-100 text-red-600",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Copy className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800">Duplicate Checklist Detected</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                A checklist with the same <span className="font-medium text-gray-700">name</span> and{" "}
                <span className="font-medium text-gray-700">recurrency</span> already exists.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Duplicate details ───────────────────────────────────────────── */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Existing checklist
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{dupTitle}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[dupStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {dupStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-500">Recurrency:</span>
                <span>{frequencyLabel(dupFrequency)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-500">Created:</span>
                <span className="truncate">{dupCreatedAt}</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-500">Last updated:</span>
                <span>{dupUpdatedAt}</span>
              </div>
            </div>
          </div>

          {/* Conflict explanation */}
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed">
            Two checklists cannot share the same <span className="font-medium">name</span> and{" "}
            <span className="font-medium">recurrency type</span> to avoid confusion during execution.
            Either rename your checklist, change its recurrency, or save it anyway (it will be kept
            as a separate checklist with a note of the conflict).
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          {/* Primary: go back and rename */}
          <button
            type="button"
            onClick={() => onResolve("server")}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
          >
            <X className="w-4 h-4" />
            Go back and rename / change recurrency
          </button>

          {/* Secondary: save anyway */}
          <button
            type="button"
            onClick={() => onResolve("local")}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300 rounded-xl font-medium text-sm transition-all"
          >
            <Copy className="w-4 h-4" />
            Save anyway (keep as duplicate)
          </button>
        </div>
      </div>
    </div>
  );
}